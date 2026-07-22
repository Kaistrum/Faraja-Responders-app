import { useEffect, useRef, useState, useCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MapContainer,
	TileLayer,
	LayersControl,
	Marker,
	Polyline,
	useMap,
	useMapEvents
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { IconStack2, IconChevronDown } from "@tabler/icons-react";
import { CrisisReport, DisasterType, DISASTER_COLORS } from "@/types";
import { DISASTER_ICON, DisasterGlyph } from "@/components/icons";
import { NavigationTarget } from "@/utils/routing";

const { BaseLayer } = LayersControl;

const LEGEND_DISASTERS = Object.keys(DISASTER_COLORS) as DisasterType[];

function disasterSvg(type: DisasterType, size: number, color: string): string {
	const Comp = DISASTER_ICON[type] ?? DISASTER_ICON.Other;
	return renderToStaticMarkup(<Comp size={size} color={color} stroke={2.2} />);
}

function DisasterLegend() {
	return (
		<details className="group absolute bottom-3 left-3 z-[1000]">
			<summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 text-xs font-semibold text-text shadow-md [&::-webkit-details-marker]:hidden">
				<IconStack2 size={14} className="text-text-muted" />
				Legend
				<IconChevronDown size={12} className="text-text-muted transition-transform group-open:rotate-180" />
			</summary>
			<div className="absolute bottom-10 left-0 min-w-[220px] rounded-lg border border-border bg-bg-card p-2.5 shadow-lg">
				<p className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wide text-text-muted">
					Disaster type
				</p>
				<div className="grid grid-cols-2 gap-1">
					{LEGEND_DISASTERS.map(type => (
						<div key={type} className="flex items-center gap-2 px-1.5 py-1">
							<span
								className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
								style={{ background: DISASTER_COLORS[type] }}>
								<DisasterGlyph type={type} size={11} color="#ffffff" stroke={2.3} />
							</span>
							<span className="text-xs text-text">{type}</span>
						</div>
					))}
				</div>

				<p className="mt-3 mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wide text-text-muted">
					Status
				</p>
				<div className="flex items-center gap-2 px-1.5 py-1">
					<span className="h-3 w-3 shrink-0 rounded-full bg-text-muted" />
					<span className="text-xs text-text">Attended</span>
				</div>
			</div>
		</details>
	);
}

function makeReportIcon(disasterType: DisasterType, attended: boolean) {
	const color = attended ? "#837c6f" : (DISASTER_COLORS[disasterType] ?? "#837c6f");
	const glyph = disasterSvg(disasterType, 10, color);
	return L.divIcon({
		className: "",
		html: `
      <div style="position:relative;width:32px;height:40px">
        <div style="
          width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:${color};transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          border:2.5px solid white;
        "></div>
        <div style="
          position:absolute;top:6px;left:6px;
          width:16px;height:16px;border-radius:50%;
          background:white;opacity:0.95;
          display:flex;align-items:center;justify-content:center;
        ">${glyph}</div>
      </div>`,
		iconSize: [32, 40],
		iconAnchor: [16, 40]
	});
}

// ── User location ─────────────────────────────────────────────────────────────
interface UserLocationProps {
	onPosition: (pos: [number, number]) => void;
}

function UserLocation({ onPosition }: UserLocationProps) {
	const map = useMap();
	const markerRef = useRef<L.Marker | null>(null);
	const hasCentred = useRef(false);

	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
      @keyframes loc-pulse {
        0%,100%{transform:scale(1);opacity:0.6}
        50%{transform:scale(2.8);opacity:0}
      }
      .loc-pulse{animation:loc-pulse 1.5s ease-out infinite}
    `;
		document.head.appendChild(style);

		if (!navigator.geolocation) {
			return () => document.head.removeChild(style);
		}

		const icon = L.divIcon({
			className: "",
			html: `<div style="position:relative;width:20px;height:20px">
        <div class="loc-pulse" style="position:absolute;inset:0;background:#3b82f6;border-radius:50%"></div>
        <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;background:#3b82f6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
      </div>`,
			iconSize: [20, 20],
			iconAnchor: [10, 10]
		});

		const watchId = navigator.geolocation.watchPosition(
			({ coords }) => {
				const pos: [number, number] = [coords.latitude, coords.longitude];
				onPosition(pos);
				if (!hasCentred.current) {
					map.flyTo(pos, 13, { animate: true, duration: 1.2 });
					hasCentred.current = true;
				}
				if (markerRef.current) {
					markerRef.current.setLatLng(pos);
				} else {
					markerRef.current = L.marker(pos, { icon })
						.addTo(map)
						.bindTooltip("You", { permanent: false });
				}
			},
			null,
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
		);

		return () => {
			document.head.removeChild(style);
			navigator.geolocation.clearWatch(watchId);
			markerRef.current?.remove();
		};
	}, [map, onPosition]);

	return null;
}

// ── Route layer (traversed = low opacity, remaining = high opacity) ───────────
function findClosestIndex(route: [number, number][], pos: [number, number]) {
	let idx = 0;
	let best = Infinity;
	for (let i = 0; i < route.length; i++) {
		const d = Math.hypot(route[i][0] - pos[0], route[i][1] - pos[1]);
		if (d < best) {
			best = d;
			idx = i;
		}
	}
	return idx;
}

interface RouteLayerProps {
	route: [number, number][];
	userPos: [number, number] | null;
}

function RouteLayer({ route, userPos }: RouteLayerProps) {
	if (route.length < 2) return null;
	const splitIdx = userPos ? findClosestIndex(route, userPos) : 0;
	const traversed = route.slice(0, splitIdx + 1);
	const remaining = route.slice(splitIdx);

	return (
		<>
			{traversed.length >= 2 && (
				<Polyline
					positions={traversed}
					pathOptions={{ color: "#fece09", weight: 5, opacity: 0.25 }}
				/>
			)}
			{remaining.length >= 2 && (
				<Polyline
					positions={remaining}
					pathOptions={{ color: "#fece09", weight: 5, opacity: 0.9 }}
				/>
			)}
		</>
	);
}

// ── Placeholder map-click listener (keeps map interactive) ───────────────────
function MapEventListener() {
	useMapEvents({ click: () => {} });
	return null;
}

// ── Main exported component ───────────────────────────────────────────────────
interface ResponderMapProps {
	reports: CrisisReport[];
	onReportClick: (report: CrisisReport) => void;
	navigationTarget: NavigationTarget | null;
	onUserPosition?: (pos: [number, number]) => void;
}

export default function ResponderMap({
	reports,
	onReportClick,
	navigationTarget,
	onUserPosition
}: ResponderMapProps) {
	const [userPos, setUserPos] = useState<[number, number] | null>(null);

	const handlePosition = useCallback(
		(pos: [number, number]) => {
			setUserPos(pos);
			onUserPosition?.(pos);
		},
		[onUserPosition]
	);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			<DisasterLegend />
			<MapContainer
				center={[-1.2921, 36.8219]}
				zoom={12}
				style={{ height: "100%", width: "100%", zIndex: 10 }}>
				<LayersControl position="topright">
					<BaseLayer name="Dark" checked>
						<TileLayer
							url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
							attribution='&copy; OpenStreetMap &copy; CARTO'
						/>
					</BaseLayer>
					<BaseLayer name="Streets">
						<TileLayer
							url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
						/>
					</BaseLayer>
					<BaseLayer name="Satellite">
						<TileLayer
							url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
							attribution="Tiles &copy; Esri"
						/>
					</BaseLayer>
				</LayersControl>

				<UserLocation onPosition={handlePosition} />
				<MapEventListener />

				{reports.map(report => (
					<Marker
						key={report.id}
						position={[report.location.lat, report.location.lng]}
						icon={makeReportIcon(report.disasterType, report.status === "attended")}
						eventHandlers={{ click: () => onReportClick(report) }}
					/>
				))}

				{navigationTarget && (
					<RouteLayer route={navigationTarget.route} userPos={userPos} />
				)}
			</MapContainer>
		</div>
	);
}
