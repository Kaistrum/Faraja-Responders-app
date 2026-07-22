import { useEffect, useState } from "react";

// Lightweight geolocation watcher for pages that don't mount the Leaflet map
// (which has its own watcher). Returns the latest [lat, lon] or null.
export function useGeolocation(): [number, number] | null {
	const [pos, setPos] = useState<[number, number] | null>(null);

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.geolocation) return;
		const watchId = navigator.geolocation.watchPosition(
			({ coords }) => setPos([coords.latitude, coords.longitude]),
			() => {}, // ignore errors; callers render a null position gracefully
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
		);
		return () => navigator.geolocation.clearWatch(watchId);
	}, []);

	return pos;
}
