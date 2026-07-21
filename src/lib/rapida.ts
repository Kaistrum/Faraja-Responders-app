/**
 * Shared type definitions and transform helpers for the RAPIDA API.
 * Server-side only — no browser APIs.
 */

import type { CrisisReport, DisasterType, Urgency } from "@/types";

// ─── Raw RAPIDA shapes ────────────────────────────────────────────────────────

export interface RapidaReport {
  report_id: string;
  lat: number | null;
  lon: number | null;
  location_description: string | null;
  infrastructure_type: string | null;
  nature_of_crisis: string | null;
  debris: boolean;
  affected_units: number | null;
  damage_level: string | null;
  photo_url: string | null;
  submitted_at: string | null;
}

export interface RapidaAssignment {
  assignment_id: string;
  report: string; // UUID of the linked CrisisReport
  responder: string; // UUID of the Responder
  responder_name: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | null;
  priority: "low" | "normal" | "high" | "critical" | null;
  notes: string | null;
  assigned_at: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_by: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  results: T[];
}

// ─── Pagination helper ────────────────────────────────────────────────────────

export async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  const firstRes = await fetch(baseUrl);
  if (!firstRes.ok) return [];

  const firstData = (await firstRes.json()) as PaginatedResponse<T>;
  // Non-paginated response (plain array)
  if (Array.isArray(firstData)) return firstData as unknown as T[];
  if (!firstData.results) return [];
  if (!firstData.next || firstData.results.length === 0) return firstData.results;

  const pageSize = firstData.results.length;
  const totalPages = Math.ceil(firstData.count / pageSize);
  const pageUrls = Array.from({ length: totalPages - 1 }, (_, i) =>
    `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${i + 2}`,
  );

  const rest = await Promise.all(
    pageUrls.map((url) =>
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<PaginatedResponse<T>>) : { results: [] as T[] }))
        .then((d) => (Array.isArray(d) ? (d as unknown as T[]) : d.results ?? [])),
    ),
  );

  return [firstData.results, ...rest].flat();
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapPriorityToUrgency(priority: RapidaAssignment["priority"]): Urgency {
  switch (priority) {
    case "critical": return "critical";
    case "high": return "high";
    case "low": return "low";
    default: return "medium";
  }
}

// Same mapping as dashboard/src/lib/rapida.ts's mapDisasterType, so a given
// nature_of_crisis value renders as the same DisasterType (and color) here too.
function mapDisasterType(natureOfCrisis: string | null): DisasterType {
  switch (natureOfCrisis?.toLowerCase()) {
    case "chemical": return "Chemical";
    case "flood": return "Flood";
    case "wildfire": return "Fire";
    case "earthquake": return "Earthquake";
    case "hurricane": return "Hurricane";
    case "cyclone": return "Cyclone";
    case "landslide": return "Landslide";
    case "tsunami": return "Tsunami";
    case "civil_unrest": return "Civil Unrest";
    case "conflict": return "Conflict";
    default: return "Other";
  }
}

function label(raw: string | null): string {
  if (!raw) return "Unknown";
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Transform function ───────────────────────────────────────────────────────

export function toCrisisReport(
  assignment: RapidaAssignment,
  report: RapidaReport,
): CrisisReport {
  const infrastructureLabel = label(report.infrastructure_type);
  const crisisLabel = label(report.nature_of_crisis);

  return {
    id: assignment.assignment_id,
    title: `${crisisLabel} — ${infrastructureLabel}`,
    location: { lat: report.lat ?? 0, lng: report.lon ?? 0 },
    address: report.location_description ?? "Unknown location",
    reportedAt: report.submitted_at ?? assignment.assigned_at,
    urgency: mapPriorityToUrgency(assignment.priority),
    disasterType: mapDisasterType(report.nature_of_crisis),
    status: assignment.status === "completed" ? "attended" : "assigned",
    attendedAt: assignment.completed_at ?? undefined,
    notes: assignment.notes ?? undefined,
    survey: {
      infrastructureTypes: report.infrastructure_type ? [infrastructureLabel] : [],
      description: `${crisisLabel} affecting ${infrastructureLabel.toLowerCase()} infrastructure.`,
      damageLevel: label(report.damage_level),
      debrisPresent: report.debris,
      affectedCount: report.affected_units ?? 0,
    },
    images: report.photo_url ? [report.photo_url] : [],
    reporter: "Field submission",
  };
}
