import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Badge, Spinner, Checkbox, Button, Alert, Modal } from "@kaistrum/stratum-ui";
import {
	IconMapPin,
	IconExternalLink,
	IconCopy,
	IconCheck,
	IconQrcode
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import { buildMultiStopRoute, buildMapsLegs, type MapsLeg } from "@/utils/routing";
import { useResponderReports } from "@/lib/useResponderReports";
import { drawQrToCanvas } from "@/lib/qr";
import TopNav from "@/components/TopNav";

const ResponderMap = dynamic(() => import("@/components/ResponderMap"), {
	ssr: false,
	loading: () => (
		<div className="flex h-full items-center justify-center bg-bg-card">
			<Spinner size={22} />
		</div>
	)
});

type BadgeVariant = "accent" | "info" | "success" | "warning" | "danger" | "neutral" | "outline";

const URGENCY_VARIANT: Record<string, BadgeVariant> = {
	critical: "danger",
	high: "warning",
	medium: "info",
	low: "success"
};

function QrCanvas({ url }: { url: string }) {
	const ref = useRef<HTMLCanvasElement | null>(null);
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		if (!ref.current) return;
		try {
			drawQrToCanvas(ref.current, url);
			setErr(null);
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Could not render QR");
		}
	}, [url]);

	return (
		<div className="flex flex-col items-center gap-1.5">
			<canvas
				ref={ref}
				width={240}
				height={240}
				className="rounded-lg bg-white"
				style={{ width: 240, height: 240, display: err ? "none" : "block" }}
			/>
			{err && <p className="text-center text-xs text-danger">{err}</p>}
		</div>
	);
}

function CopyLinkButton({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable — no-op */
		}
	};
	return (
		<Button
			variant="outline"
			size="sm"
			className="flex-1"
			icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
			onClick={copy}>
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}

export default function RoutePage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const { reports, loading, error, failedCount } = useResponderReports();
	const [userPos, setUserPos] = useState<[number, number] | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [qrLeg, setQrLeg] = useState<MapsLeg | null>(null);

	useEffect(() => {
		if (!isLoading && !responder) router.replace("/login");
	}, [responder, isLoading, router]);

	const activeReports = useMemo(() => reports.filter(r => r.status === "assigned"), [reports]);

	useEffect(() => {
		setSelectedIds(prev => {
			const activeIdSet = new Set(activeReports.map(r => r.id));
			const next = new Set([...prev].filter(id => activeIdSet.has(id)));
			return next.size === prev.size ? prev : next;
		});
	}, [activeReports]);

	const selectedStops = useMemo(
		() => activeReports.filter(r => selectedIds.has(r.id)),
		[activeReports, selectedIds]
	);

	const optimized = useMemo(() => {
		if (!userPos || selectedStops.length === 0) return null;
		return buildMultiStopRoute(userPos, selectedStops);
	}, [userPos, selectedStops]);

	const mapsLegs = useMemo(() => {
		if (!userPos || !optimized) return [];
		return buildMapsLegs(userPos, optimized.order);
	}, [userPos, optimized]);

	const toggle = useCallback((id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const allSelected = activeReports.length > 0 && selectedIds.size === activeReports.length;
	const toggleAll = useCallback(() => {
		setSelectedIds(prev =>
			prev.size === activeReports.length ? new Set() : new Set(activeReports.map(r => r.id))
		);
	}, [activeReports]);

	if (isLoading || !responder) {
		return (
			<div className="flex h-[100dvh] items-center justify-center bg-bg">
				<Spinner size={28} />
			</div>
		);
	}

	const navTarget =
		optimized && optimized.order.length > 0
			? { report: optimized.order[0], route: optimized.route }
			: null;

	return (
		<div className="flex h-[100dvh] flex-col bg-bg pt-16">
			<TopNav />

			{/* Header */}
			<div className="z-20 flex min-h-[52px] flex-shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-2">
				<h1 className="flex-1 text-sm font-bold text-text">Optimized Route</h1>
				{optimized && (
					<Badge variant="accent">
						{optimized.order.length} stop{optimized.order.length === 1 ? "" : "s"} ·{" "}
						{optimized.totalKm.toFixed(1)} km
					</Badge>
				)}
			</div>

			{/* Map */}
			<div className="relative h-[40%] flex-shrink-0 overflow-hidden">
				<ResponderMap
					reports={optimized ? optimized.order : selectedStops}
					onReportClick={() => {}}
					navigationTarget={navTarget}
					onUserPosition={setUserPos}
				/>
			</div>

			{/* Controls + list */}
			<div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
				{error && (
					<Alert variant="danger" className="mb-2.5">
						{error}
					</Alert>
				)}
				{!error && failedCount > 0 && (
					<Alert variant="warning" className="mb-2.5">
						{failedCount} assignment{failedCount === 1 ? "" : "s"} could not load report details
					</Alert>
				)}

				{loading && (
					<div className="flex justify-center py-8">
						<Spinner size={22} />
					</div>
				)}

				{!loading && !error && activeReports.length === 0 && (
					<p className="py-8 text-center text-sm text-text-dim">No active assignments to route</p>
				)}

				{!loading && activeReports.length > 0 && (
					<>
						<div className="mb-2 flex items-center justify-between">
							<Checkbox label="Select all" checked={allSelected} onChange={toggleAll} />
							<span className="text-xs text-text-dim">{selectedIds.size} selected</span>
						</div>

						{!userPos && selectedIds.size > 0 && (
							<Alert variant="warning" className="mb-2.5">
								Waiting for your location to compute the route…
							</Alert>
						)}

						{/* Google Maps hand-off */}
						{optimized && mapsLegs.length > 0 && (
							<div className="mb-3 flex flex-col gap-2">
								{mapsLegs.length > 1 && (
									<p className="text-xs text-text-dim">
										Google Maps limits stops per link, so this route is split into {mapsLegs.length} legs.
									</p>
								)}
								{mapsLegs.map((leg, i) => (
									<div key={i} className="rounded-lg border border-border bg-bg-card p-3">
										<p className="mb-1.5 text-xs font-semibold text-text">
											{mapsLegs.length > 1 ? `Leg ${i + 1}: stops ${leg.fromStop}–${leg.toStop}` : "Full route"}
										</p>
										<div className="flex gap-1.5">
											<Button
												variant="primary"
												size="sm"
												className="flex-1"
												icon={<IconExternalLink size={14} />}
												onClick={() => window.open(leg.url, "_blank", "noopener")}>
												Open
											</Button>
											<CopyLinkButton url={leg.url} />
											<Button
												variant="outline"
												size="sm"
												onClick={() => setQrLeg(leg)}
												aria-label="Show QR code">
												<IconQrcode size={16} />
											</Button>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Selectable / ordered stop list */}
						<div className="flex flex-col gap-2">
							{activeReports.map(report => {
								const orderIndex = optimized
									? optimized.order.findIndex(s => s.id === report.id)
									: -1;
								return (
									<div
										key={report.id}
										className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-card p-3">
										<Checkbox checked={selectedIds.has(report.id)} onChange={() => toggle(report.id)} />
										{orderIndex >= 0 && (
											<div className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-text-on-accent">
												{orderIndex + 1}
											</div>
										)}
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center justify-between gap-2">
												<span className="flex-1 truncate text-sm font-semibold text-text">
													{report.title}
												</span>
												<Badge variant={URGENCY_VARIANT[report.urgency] ?? "neutral"}>
													{report.priority}
												</Badge>
											</div>
											<div className="flex items-center gap-1 text-text-dim">
												<IconMapPin size={12} className="text-text-muted" />
												<span className="truncate text-xs">{report.address}</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}
			</div>

			<Modal
				open={!!qrLeg}
				onClose={() => setQrLeg(null)}
				title="Scan to open in Google Maps"
				size="sm">
				{qrLeg && (
					<div className="flex flex-col items-center gap-3">
						<QrCanvas url={qrLeg.url} />
						<p className="text-center text-xs text-text-dim">
							Point your phone camera at the code to open the directions.
						</p>
					</div>
				)}
			</Modal>
		</div>
	);
}
