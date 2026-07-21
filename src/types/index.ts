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

export interface SurveyData {
	infrastructureTypes: string[];
	description: string;
	damageLevel: string;
	debrisPresent: boolean;
	affectedCount: number;
}

export interface CrisisReport {
	id: string;
	title: string;
	location: { lat: number; lng: number };
	address: string;
	reportedAt: string;
	urgency: Urgency;
	disasterType: DisasterType;
	status: ReportStatus;
	attendedAt?: string;
	notes?: string;
	survey: SurveyData;
	images: string[];
	reporter: string;
}

export interface Responder {
	id: string;
	name: string;
	badge: string;
	department: string;
	phone: string;
	email: string;
	stats: {
		reportsAttended: number;
		avgResponseTime: string;
		activeReports: number;
	};
}
