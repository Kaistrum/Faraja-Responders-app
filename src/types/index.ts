import type {
	AssignmentStatus,
	AssignmentPriority,
	NatureOfCrisis,
	InfrastructureType,
	DamageLevel
} from "@/lib/api";

export type Urgency = "low" | "medium" | "high" | "critical";
export type ReportStatus = "assigned" | "attended";

export type DisasterType =
	| "Chemical"
	| "Earthquake"
	| "Fire"
	| "Flood"
	| "Hurricane"
	| "Cyclone"
	| "Landslide"
	| "Tsunami"
	| "Civil Unrest"
	| "Conflict"
	| "Other";

// Same palette as the dashboard app's DISASTER_COLORS — kept identical so a
// given disaster type reads as the same color across the whole app suite.
export const DISASTER_COLORS: Record<DisasterType, string> = {
	Chemical: "#6F7D2C",
	Earthquake: "#FF6B35",
	Fire: "#E74C3C",
	Flood: "#3498DB",
	Hurricane: "#8E44AD",
	Cyclone: "#6C3483",
	Landslide: "#795548",
	Tsunami: "#1A5276",
	"Civil Unrest": "#E67E22",
	Conflict: "#922B21",
	Other: "#607D8B"
};

/**
 * View model for one assignment joined with its crisis report. Every field
 * traces to a real backend field (see src/lib/api.ts for the raw shapes) —
 * no fabricated data. `title` / `urgency` / `disasterType` / `status` are
 * display derivations of priority, nature_of_crisis, and assignment status.
 */
export interface CrisisReport {
	id: string; // assignment_id
	reportId: string;
	title: string; // "<Nature Of Crisis> — <Infrastructure Type>"
	location: { lat: number; lng: number };
	address: string; // location_description, or "Unknown location"
	reportedAt: string; // submitted_at, falling back to assigned_at
	assignedAt: string;
	dueDate: string | null;
	urgency: Urgency; // from assignment priority
	priority: AssignmentPriority;
	disasterType: DisasterType; // mapped from nature_of_crisis (for colors)
	natureOfCrisis: NatureOfCrisis | "" | null;
	infrastructureType: InfrastructureType | "" | null;
	damageLevel: DamageLevel | "" | null;
	debris: boolean;
	affectedUnits: number | null;
	photoUrl: string | null;
	status: ReportStatus; // completed → attended, everything else → assigned
	assignmentStatus: AssignmentStatus;
	attendedAt?: string; // completed_at when set
	notes?: string;
}
