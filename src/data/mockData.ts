import { CrisisReport, Responder } from "@/types";

export const MOCK_CREDENTIALS = {
	email: "j.odhiambo@nairobi.go.ke",
	password: "responder123"
};

export const mockResponder: Responder = {
	id: "R001",
	name: "James Odhiambo",
	badge: "KR-2891",
	department: "Nairobi Emergency Response Unit",
	phone: "+254 700 123 456",
	email: "j.odhiambo@nairobi.go.ke",
	stats: {
		reportsAttended: 42,
		avgResponseTime: "18 min",
		activeReports: 3
	}
};

export const mockReports: CrisisReport[] = [
	{
		id: "CR001",
		title: "Road Collapse — Ngong Road",
		location: { lat: -1.3005, lng: 36.7739 },
		address: "Ngong Road, near Karen roundabout, Nairobi",
		reportedAt: "2026-06-17T06:30:00",
		urgency: "critical",
		disasterType: "Landslide",
		status: "assigned",
		survey: {
			infrastructureTypes: ["Road", "Bridge"],
			description:
				"Large section of road has collapsed inward following overnight rains. Approximately 20m of roadway is impassable.",
			damageLevel: "Severe",
			debrisPresent: true,
			affectedCount: 150
		},
		images: [
			"https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=400&q=80",
			"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"
		],
		reporter: "Mary Wanjiku"
	},
	{
		id: "CR002",
		title: "Building Structural Damage — Westlands",
		location: { lat: -1.2678, lng: 36.8082 },
		address: "Westlands Commercial Avenue, Nairobi",
		reportedAt: "2026-06-17T07:15:00",
		urgency: "high",
		disasterType: "Other",
		status: "assigned",
		survey: {
			infrastructureTypes: ["Building", "Electrical"],
			description:
				"Multi-story commercial building showing significant cracks on the east facade. Tenants evacuated. Electrical wires exposed on 2nd floor.",
			damageLevel: "Moderate",
			debrisPresent: false,
			affectedCount: 60
		},
		images: [
			"https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80"
		],
		reporter: "Peter Kamau"
	},
	{
		id: "CR003",
		title: "Flash Flooding — Kibera",
		location: { lat: -1.3131, lng: 36.7854 },
		address: "Olympic Estate Road, Kibera, Nairobi",
		reportedAt: "2026-06-17T05:45:00",
		urgency: "high",
		disasterType: "Flood",
		status: "assigned",
		survey: {
			infrastructureTypes: ["Road", "Sewage", "Housing"],
			description:
				"Flash flooding following overnight rainfall. Sewage overflow mixing with floodwater on main road. Several homes partially submerged.",
			damageLevel: "Severe",
			debrisPresent: true,
			affectedCount: 300
		},
		images: [
			"https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&q=80",
			"https://images.unsplash.com/photo-1504501650895-2441b7915699?w=400&q=80"
		],
		reporter: "Susan Achieng"
	},
	{
		id: "CR004",
		title: "Power Line Down — Langata",
		location: { lat: -1.3356, lng: 36.7617 },
		address: "Langata Road, near Wilson Airport, Nairobi",
		reportedAt: "2026-06-17T08:00:00",
		urgency: "medium",
		disasterType: "Other",
		status: "attended",
		attendedAt: "2026-06-17T09:10:00",
		notes: "KPLC notified, area cordoned off. Repair crew ETA 2 hours.",
		survey: {
			infrastructureTypes: ["Electrical", "Road"],
			description:
				"Overhead power line brought down by a fallen tree. Live wire across the road. Traffic diverted.",
			damageLevel: "Moderate",
			debrisPresent: true,
			affectedCount: 40
		},
		images: [
			"https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=80"
		],
		reporter: "David Mwangi"
	}
];
