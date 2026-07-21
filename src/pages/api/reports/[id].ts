import type { NextApiRequest, NextApiResponse } from "next";
import { bustReportsCache } from "../reports";

const BASE = (process.env.RAPIDA_API_BASE ?? "").replace(/\/+$/, "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ success: false });
  }

  const { id } = req.query as { id: string };
  const { notes } = req.body as { notes?: string };

  if (!BASE) return res.status(200).json({ success: true });

  try {
    const fwdRes = await fetch(`${BASE}/assignments/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        status: "completed",
        notes,
        completed_at: new Date().toISOString(),
      }),
    });
    bustReportsCache();
    if (!fwdRes.ok) {
      return res.status(fwdRes.status).json({ success: false });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to PATCH assignment:", err);
    return res.status(500).json({ success: false });
  }
}
