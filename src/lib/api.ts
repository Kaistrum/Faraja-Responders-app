/**
 * Single API layer for the responders-app. All network calls to the RAPIDA
 * backend go through here — no fetch() calls in components/pages.
 *
 * Every call goes through /api/proxy/* (see next.config.ts rewrites), which
 * forwards to http://5.189.150.44/api/* server-side. This keeps the browser
 * talking only to the app's own HTTPS origin (avoids mixed content) and lets
 * Django's session cookie pass through untouched in both directions.
 *
 * Types below are transcribed from the live schema at /api/schema/?format=json
 * (RAPIDA API, Django REST Framework) — not guessed. Fields the UI needs that
 * don't exist on the backend are NOT invented here; callers must handle their
 * absence explicitly.
 */

const PROXY = "/api/proxy";

// ─── Enums (verbatim from the schema's component enums) ───────────────────

export type RoleEnum = "admin" | "field" | "analyst" | "supervisor";
export type AssignmentStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type AssignmentPriority = "low" | "normal" | "high" | "critical";
export type InfrastructureType =
	| "residential" | "commercial" | "government" | "utility"
	| "transport" | "community" | "recreation" | "other";
export type NatureOfCrisis =
	| "earthquake" | "flood" | "tsunami" | "cyclone" | "wildfire"
	| "explosion" | "conflict" | "civil_unrest" | "chemical" | "other";
export type DamageLevel = "minimal" | "partial" | "complete";

// ─── Raw backend shapes ────────────────────────────────────────────────────

export interface BackendResponder {
	responder_id: string;
	name: string;
	email: string;
	role: RoleEnum;
	organization: string | null;
	is_active: boolean;
	last_login: string | null;
	location_description: string | null;
	created_at: string;
}

export interface Assignment {
	assignment_id: string;
	responder_name: string;
	status: AssignmentStatus;
	priority: AssignmentPriority;
	notes: string | null;
	assigned_at: string;
	due_date: string | null;
	completed_at: string | null; // read-only server-side, do not PATCH this
	report: string; // report UUID only, not a nested object
	responder: string;
	assigned_by: string | null;
}

// The "Full" crisis-report serializer (GET /api/reports/{id}/)
export interface RapidaReport {
	report_id: string;
	client_id: string | null;
	lat: string; // backend returns these as strings on the Full serializer
	lon: string;
	location: { type: "Point"; coordinates: [number, number] } | string;
	location_description: string | null;
	building_footprint_id: string | null;
	is_latest: boolean;
	infrastructure_type: InfrastructureType | "" | null;
	nature_of_crisis: NatureOfCrisis | "" | null;
	debris: boolean;
	affected_units: number | null;
	damage_level: DamageLevel | "" | null;
	photo_url: string | null;
	submitted_at: string | null;
	processed_at: string | null;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface PaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

// An assignment joined with its report detail. reportDetail is null when the
// per-report fetch failed — callers must render that as an error, not omit it.
export interface AssignmentWithReport extends Assignment {
	reportDetail: RapidaReport | null;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {}
export class ApiError extends Error {
	constructor(message: string, public status: number) {
		super(message);
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${PROXY}${path}`, init);
	if (res.status === 401) throw new UnauthorizedError("Session expired");
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new ApiError(body?.error ?? body?.detail ?? `Request failed (${res.status})`, res.status);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<void> {
	// Deliberately NOT using request(): a 401 here means "wrong credentials",
	// not "session expired", so we surface Django's own message rather than
	// throwing UnauthorizedError.
	const res = await fetch(`${PROXY}/responders/login/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password })
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new Error(body?.error ?? body?.detail ?? `Login failed (${res.status})`);
	}
}

// No "current session" endpoint exists on this backend, so the responder
// record is looked up by the email just used to log in. GET /api/responders/
// is unauthenticated-readable regardless of session state.
export async function findResponderByEmail(email: string): Promise<BackendResponder | null> {
	const data = await request<PaginatedResponse<BackendResponder> | BackendResponder[]>(
		`/responders/?search=${encodeURIComponent(email)}`
	);
	const results = Array.isArray(data) ? data : data.results;
	return results.find(r => r.email.toLowerCase() === email.toLowerCase()) ?? null;
}

// There's no backend logout endpoint (confirmed absent from the schema), so
// this only clears the session cookie the app itself holds — it does not
// invalidate the session on the Django side.
export async function logout(): Promise<void> {
	await fetch("/api/session/clear", { method: "POST" });
}

// ─── Assignments ────────────────────────────────────────────────────────────

// responder_id is a client-supplied query param on the real backend (not
// derived from the session — confirmed in views.py). Anyone can pass any
// UUID and read that responder's assignments; there's no ownership check
// server-side. Flagged, not fixed here — frontend has no way to fix a
// server-side authorization hole.
export async function getAssignmentsByResponder(responderId: string): Promise<Assignment[]> {
	return request<Assignment[]>(`/assignments/by_responder/?responder_id=${encodeURIComponent(responderId)}`);
}

export async function getReport(reportId: string): Promise<RapidaReport> {
	return request<RapidaReport>(`/reports/${reportId}/`);
}

export async function getAssignmentsWithReports(responderId: string): Promise<AssignmentWithReport[]> {
	const assignments = await getAssignmentsByResponder(responderId);
	const uniqueReportIds = [...new Set(assignments.map(a => a.report))];
	const reportById = new Map<string, RapidaReport | null>();

	await Promise.all(
		uniqueReportIds.map(async id => {
			try {
				reportById.set(id, await getReport(id));
			} catch {
				reportById.set(id, null);
			}
		})
	);

	return assignments.map(a => ({ ...a, reportDetail: reportById.get(a.report) ?? null }));
}

export async function updateAssignment(
	assignmentId: string,
	patch: Partial<Pick<Assignment, "status" | "priority" | "notes" | "due_date">>
): Promise<Assignment> {
	return request<Assignment>(`/assignments/${assignmentId}/`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch)
	});
}

// ─── View-model adapter ─────────────────────────────────────────────────────

import type { CrisisReport, DisasterType, Urgency } from "@/types";

function mapPriorityToUrgency(priority: AssignmentPriority | null): Urgency {
	switch (priority) {
		case "critical": return "critical";
		case "high": return "high";
		case "low": return "low";
		default: return "medium";
	}
}

// Same mapping as dashboard/src/lib/rapida.ts so a given nature_of_crisis
// renders as the same DisasterType (and color) across the app suite.
function mapDisasterType(natureOfCrisis: string | null | undefined): DisasterType {
	switch (natureOfCrisis?.toLowerCase()) {
		case "chemical": return "Chemical";
		case "flood": return "Flood";
		case "wildfire": return "Fire";
		case "earthquake": return "Earthquake";
		case "cyclone": return "Cyclone";
		case "tsunami": return "Tsunami";
		case "civil_unrest": return "Civil Unrest";
		case "conflict": return "Conflict";
		default: return "Other"; // includes "explosion" and "other" (no dedicated glyph)
	}
}

export function label(raw: string | null | undefined): string {
	if (!raw) return "Unknown";
	return raw
		.split("_")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

export interface ReportsLoadResult {
	reports: CrisisReport[];
	// Assignments whose report detail fetch failed; surfaced so pages can
	// warn instead of silently dropping data.
	failedCount: number;
}

export async function loadResponderReports(responderId: string): Promise<ReportsLoadResult> {
	const joined = await getAssignmentsWithReports(responderId);
	const reports: CrisisReport[] = [];
	let failedCount = 0;

	for (const a of joined) {
		const r = a.reportDetail;
		if (!r) {
			failedCount++;
			continue;
		}
		reports.push({
			id: a.assignment_id,
			reportId: r.report_id,
			title: `${label(r.nature_of_crisis)} — ${label(r.infrastructure_type)}`,
			location: { lat: Number(r.lat), lng: Number(r.lon) },
			address: r.location_description ?? "Unknown location",
			reportedAt: r.submitted_at ?? a.assigned_at,
			assignedAt: a.assigned_at,
			dueDate: a.due_date,
			urgency: mapPriorityToUrgency(a.priority),
			priority: a.priority,
			disasterType: mapDisasterType(r.nature_of_crisis),
			natureOfCrisis: r.nature_of_crisis,
			infrastructureType: r.infrastructure_type,
			damageLevel: r.damage_level,
			debris: r.debris,
			affectedUnits: r.affected_units,
			photoUrl: r.photo_url,
			status: a.status === "completed" ? "attended" : "assigned",
			assignmentStatus: a.status,
			attendedAt: a.completed_at ?? undefined,
			notes: a.notes ?? undefined
		});
	}

	reports.sort((x, y) => new Date(y.reportedAt).getTime() - new Date(x.reportedAt).getTime());
	return { reports, failedCount };
}

// completed_at is read-only server-side; PATCHing status to "completed" is
// all the client can (and should) send.
export async function markAssignmentCompleted(assignmentId: string, notes: string): Promise<Assignment> {
	return updateAssignment(assignmentId, { status: "completed", notes });
}

// ─── Responder location ─────────────────────────────────────────────────────

// lat/lon are confirmed writable on PATCH /api/responders/{id}/ (checked via
// OPTIONS). This requires an authenticated session (write endpoint).
export async function updateResponderLocation(responderId: string, lat: number, lon: number): Promise<void> {
	await request<unknown>(`/responders/${responderId}/`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ lat, lon })
	});
}
