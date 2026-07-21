import { CrisisReport } from "@/types";

export interface NavigationTarget {
	report: CrisisReport;
	route: [number, number][];
}

// Placeholder routing function — replace implementation with a custom router
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

function haversineKm(a: [number, number], b: [number, number]): number {
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

// Greedy nearest-neighbor ordering — picks the closest remaining stop at each step.
export function orderStopsByNearestNeighbor(
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
			const d = haversineKm(current, [stop.location.lat, stop.location.lng]);
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		});
		const [next] = remaining.splice(bestIdx, 1);
		ordered.push(next);
		current = [next.location.lat, next.location.lng];
	}

	return ordered;
}

// Orders stops nearest-neighbor, then chains OSRM legs into one continuous route.
export async function buildMultiStopRoute(
	start: [number, number],
	stops: CrisisReport[]
): Promise<{ order: CrisisReport[]; route: [number, number][] }> {
	const order = orderStopsByNearestNeighbor(start, stops);
	const legs: [number, number][][] = [];
	let cursor = start;

	for (const stop of order) {
		const to: [number, number] = [stop.location.lat, stop.location.lng];
		legs.push(await fetchRoute(cursor, to));
		cursor = to;
	}

	return { order, route: legs.flat() };
}
