import type { NextApiRequest, NextApiResponse } from "next";
import type { CrisisReport } from "@/types";
import { mockReports } from "@/data/mockData";
import { fetchAllPages, toCrisisReport, type RapidaAssignment, type RapidaReport } from "@/lib/rapida";

const BASE = (process.env.RAPIDA_API_BASE ?? "").replace(/\/+$/, "");

let reportsCache: { reports: CrisisReport[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function bustReportsCache() {
  reportsCache = null;
}

async function getReports(): Promise<CrisisReport[]> {
  const now = Date.now();
  if (reportsCache && reportsCache.expiresAt > now) return reportsCache.reports;

  const [assignments, reports] = await Promise.all([
    fetchAllPages<RapidaAssignment>(`${BASE}/assignments/`),
    fetchAllPages<RapidaReport>(`${BASE}/reports/`),
  ]);

  const reportsById = new Map(reports.map((r) => [r.report_id, r]));

  const crisisReports = assignments
    .map((assignment) => {
      const report = reportsById.get(assignment.report);
      return report ? toCrisisReport(assignment, report) : null;
    })
    .filter((r): r is CrisisReport => r !== null)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  reportsCache = { reports: crisisReports, expiresAt: now + CACHE_TTL_MS };
  return crisisReports;
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<CrisisReport[]>,
) {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");

  if (!BASE) return res.status(200).json(mockReports);

  try {
    return res.status(200).json(await getReports());
  } catch (err) {
    console.error("Failed to fetch reports:", err);
    return res.status(500).json([]);
  }
}
