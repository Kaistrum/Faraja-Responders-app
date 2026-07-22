import { CrisisReport } from "@/types";

export interface NavigationTarget {
	report: CrisisReport;
	route: [number, number][];
}

// Single-destination road routing used by the map page's Navigate action.
// Falls back to a straight line if OSRM is unreachable.
export async function fetchRoute(
	from: [number, number],
	to: [number, number]
): Promise<[number, number][]> {
	try {
		const url =
			`https://router.project-osrm.org/route/v1/driving/` +
			`${from[1]},${from[0]};${to[1]},${to[0]}?geometries=geojson&overview=full`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("routing failed");
		const data = await res.json();
		return (data.routes[0].geometry.coordinates as [number, number][]).map(
			([lng, lat]) => [lat, lng]
		);
	} catch {
		return [from, to]; // straight-line fallback
	}
}

export function haversineKm(a: [number, number], b: [number, number]): number {
	const R = 6371;
	const dLat = ((b[0] - a[0]) * Math.PI) / 180;
	const dLng = ((b[1] - a[1]) * Math.PI) / 180;
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((a[0] * Math.PI) / 180) *
			Math.cos((b[0] * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function coord(r: CrisisReport): [number, number] {
	return [r.location.lat, r.location.lng];
}

function pathLength(start: [number, number], stops: CrisisReport[]): number {
	let total = 0;
	let cursor = start;
	for (const stop of stops) {
		total += haversineKm(cursor, coord(stop));
		cursor = coord(stop);
	}
	return total;
}

function nearestNeighborOrder(
	start: [number, number],
	stops: CrisisReport[]
): CrisisReport[] {
	const remaining = [...stops];
	const ordered: CrisisReport[] = [];
	let current = start;

	while (remaining.length > 0) {
		let bestIdx = 0;
		let bestDist = Infinity;
		remaining.forEach((stop, i) => {
			const d = haversineKm(current, coord(stop));
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		});
		const [next] = remaining.splice(bestIdx, 1);
		ordered.push(next);
		current = coord(next);
	}

	return ordered;
}

// 2-opt improvement for an open path anchored at `start`: repeatedly reverse
// the segment [i..j] whenever doing so shortens the total distance, until no
// improving reversal exists.
function twoOptImprove(start: [number, number], order: CrisisReport[]): CrisisReport[] {
	if (order.length < 3) return order;
	const route = [...order];
	let improved = true;

	while (improved) {
		improved = false;
		for (let i = 0; i < route.length - 1; i++) {
			for (let j = i + 1; j < route.length; j++) {
				const before = i === 0 ? start : coord(route[i - 1]);
				const a = coord(route[i]);
				const b = coord(route[j]);
				const after = j === route.length - 1 ? null : coord(route[j + 1]);

				const current =
					haversineKm(before, a) + (after ? haversineKm(b, after) : 0);
				const swapped =
					haversineKm(before, b) + (after ? haversineKm(a, after) : 0);

				if (swapped < current - 1e-9) {
					// reverse segment i..j
					let lo = i;
					let hi = j;
					while (lo < hi) {
						[route[lo], route[hi]] = [route[hi], route[lo]];
						lo++;
						hi--;
					}
					improved = true;
				}
			}
		}
	}

	return route;
}

export interface MultiStopRoute {
	order: CrisisReport[];
	// Straight-line polyline: start followed by each stop in visit order.
	route: [number, number][];
	totalKm: number;
}

// Fully client-side: nearest-neighbor construction, 2-opt improvement,
// straight-line legs. No external routing API.
export function buildMultiStopRoute(
	start: [number, number],
	stops: CrisisReport[]
): MultiStopRoute {
	const order = twoOptImprove(start, nearestNeighborOrder(start, stops));
	const route: [number, number][] = [start, ...order.map(coord)];
	return { order, route, totalKm: pathLength(start, order) };
}

// ─── Google Maps hand-off ─────────────────────────────────────────────────────

const MAX_INTERMEDIATE_WAYPOINTS = 9;

function fmt(p: [number, number]): string {
	return `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
}

function directionsUrl(
	origin: [number, number],
	destination: [number, number],
	waypoints: [number, number][]
): string {
	const params = new URLSearchParams({
		api: "1",
		origin: fmt(origin),
		destination: fmt(destination),
		travelmode: "driving"
	});
	if (waypoints.length > 0) {
		params.set("waypoints", waypoints.map(fmt).join("|"));
	}
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface MapsLeg {
	url: string;
	// 1-based stop numbers (within the overall route) this leg covers.
	fromStop: number;
	toStop: number;
}

// Single-destination directions link. Omitting origin lets Google Maps use
// the phone's current location as the start automatically.
export function singleDestinationUrl(dest: [number, number]): string {
	const params = new URLSearchParams({
		api: "1",
		destination: fmt(dest),
		travelmode: "driving"
	});
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Google Maps caps intermediate waypoints (~9), so longer routes split into
// consecutive legs; each leg starts where the previous ended.
export function buildMapsLegs(start: [number, number], order: CrisisReport[]): MapsLeg[] {
	if (order.length === 0) return [];
	const points = order.map(coord);
	const perLeg = MAX_INTERMEDIATE_WAYPOINTS + 1; // waypoints + destination
	const legs: MapsLeg[] = [];
	let origin = start;
	let covered = 0;

	while (covered < points.length) {
		const chunk = points.slice(covered, covered + perLeg);
		const destination = chunk[chunk.length - 1];
		const waypoints = chunk.slice(0, -1);
		legs.push({
			url: directionsUrl(origin, destination, waypoints),
			fromStop: covered + 1,
			toStop: covered + chunk.length
		});
		origin = destination;
		covered += chunk.length;
	}

	return legs;
}
