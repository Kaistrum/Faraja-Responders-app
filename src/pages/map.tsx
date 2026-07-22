import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Alert, Spinner } from "@kaistrum/stratum-ui";
import { IconX, IconNavigation, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport, DISASTER_COLORS } from "@/types";
import { DisasterGlyph } from "@/components/icons";
import { fetchRoute, NavigationTarget } from "@/utils/routing";
import { useResponderReports } from "@/lib/useResponderReports";
import * as api from "@/lib/api";
import ReportDetailDrawer from "@/components/ReportDetailDrawer";
import TopNav from "@/components/TopNav";

const ResponderMap = dynamic(() => import("@/components/ResponderMap"), {
	ssr: false,
	loading: () => (
		<div className="flex h-full items-center justify-center bg-bg-card">
			<Spinner size={22} />
		</div>
	)
});

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
	return (
		<div className="flex-1 rounded-lg border border-border bg-bg-card px-1.5 py-2.5 text-center">
			<p className="text-lg font-bold" style={color ? { color } : undefined}>
				{value}
			</p>
			<p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
		</div>
	);
}

function StatusChip({ color, label, count }: { color: string; label: string; count: number }) {
	return (
		<div className="flex items-center gap-1.5 whitespace-nowrap">
			<span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
			<span className="text-[11px] text-text-dim">
				{label} <span className="font-bold text-text">{count}</span>
			</span>
		</div>
	);
}

function formatFeedTime(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const d = Math.floor(diff / 86400000);
	const h = Math.floor((diff % 86400000) / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	if (d > 0) return `${d}d ago`;
	if (h > 0) return `${h}h ago`;
	if (m > 0) return `${m}m ago`;
	return "just now";
}

// Average of (completed_at − assigned_at) over assignments where both exist.
// Returns null when no assignment has a usable pair — the card is omitted then.
function avgResponseTime(reports: CrisisReport[]): string | null {
	const deltas = reports
		.filter(r => r.attendedAt)
		.map(r => new Date(r.attendedAt!).getTime() - new Date(r.assignedAt).getTime())
		.filter(ms => ms > 0);
	if (deltas.length === 0) return null;
	const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
	const h = Math.floor(avgMs / 3600000);
	const m = Math.round((avgMs % 3600000) / 60000);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const LOCATION_PATCH_INTERVAL_MS = 60_000;

export default function MapPage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const [selectedReport, setSelectedReport] = useState<CrisisReport | null>(null);
	const [navTarget, setNavTarget] = useState<NavigationTarget | null>(null);
	const [userPos, setUserPos] = useState<[number, number] | null>(null);
	const lastLocationPatch = useRef(0);

	// Fire a browser notification when polling surfaces assignments that
	// weren't in the previous fetch (never on the first load).
	const notifyNew = useCallback((fresh: CrisisReport[]) => {
		if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
		const title = fresh.length === 1 ? "New report assigned" : `${fresh.length} new reports assigned`;
		const body = fresh.map(r => r.title).slice(0, 3).join("\n");
		new Notification(title, { body });
	}, []);

	const { reports, loading, error, failedCount, markAttended } = useResponderReports({
		onNewAssignments: notifyNew
	});

	useEffect(() => {
		if (!isLoading && !responder) router.replace("/login");
	}, [responder, isLoading, router]);

	// Ask for notification permission once, after login.
	useEffect(() => {
		if (!responder || typeof Notification === "undefined") return;
		if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
	}, [responder]);

	// Push the responder's live position to the backend (throttled). Failure
	// here is non-critical so it only logs.
	useEffect(() => {
		if (!responder || !userPos) return;
		const now = Date.now();
		if (now - lastLocationPatch.current < LOCATION_PATCH_INTERVAL_MS) return;
		lastLocationPatch.current = now;
		api.updateResponderLocation(responder.responder_id, userPos[0], userPos[1])
			.catch(err => console.warn("Failed to update responder location:", err));
	}, [responder, userPos]);

	const handleNavigate = useCallback(
		async (report: CrisisReport) => {
			const from: [number, number] = userPos ?? [-1.2921, 36.8219];
			const to: [number, number] = [report.location.lat, report.location.lng];
			const route = await fetchRoute(from, to);
			setNavTarget({ report, route });
		},
		[userPos]
	);

	if (isLoading || !responder) {
		return (
			<div className="flex h-[100dvh] items-center justify-center bg-bg">
				<Spinner size={28} />
			</div>
		);
	}

	const activeCount = reports.filter(r => r.status === "assigned").length;
	const attendedCount = reports.filter(r => r.status === "attended").length;
	const avgResp = avgResponseTime(reports);

	const feedItems = reports
		.flatMap(r => {
			const items: { key: string; report: CrisisReport; label: string; at: string; attended: boolean }[] = [
				{ key: `${r.id}-new`, report: r, label: "New report assigned", at: r.reportedAt, attended: false }
			];
			if (r.status === "attended" && r.attendedAt) {
				items.push({ key: `${r.id}-done`, report: r, label: "Marked attended", at: r.attendedAt, attended: true });
			}
			return items;
		})
		.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
		.slice(0, 12);

	return (
		<div className="flex h-[100dvh] flex-col bg-bg pt-16">
			<TopNav />

			<div className="mapSplit">
				<div className="mapCol">
					{error && (
						<Alert variant="danger" className="!rounded-none">
							{error}
						</Alert>
					)}
					{!error && failedCount > 0 && (
						<Alert variant="warning" className="!rounded-none">
							{failedCount} assignment{failedCount === 1 ? "" : "s"} could not load report details
						</Alert>
					)}

					<div className="flex flex-shrink-0 gap-2 px-4 py-3">
						<StatCard label="Total" value={loading ? "—" : String(reports.length)} />
						<StatCard label="Active" value={loading ? "—" : String(activeCount)} color="var(--danger)" />
						<StatCard label="Attended" value={loading ? "—" : String(attendedCount)} color="var(--success)" />
						{avgResp && <StatCard label="Avg. Resp." value={avgResp} color="var(--accent)" />}
					</div>

					{navTarget && (
						<div className="z-20 flex flex-shrink-0 items-center gap-2 bg-bg-card px-4 py-2.5">
							<IconNavigation size={16} className="text-accent" />
							<span className="flex-1 text-sm font-medium text-text">
								Navigating → {navTarget.report.title}
							</span>
							<button
								onClick={() => setNavTarget(null)}
								className="text-text-muted hover:text-text"
								aria-label="Cancel navigation">
								<IconX size={16} />
							</button>
						</div>
					)}

					<div className="mapArea">
						<ResponderMap
							reports={reports}
							onReportClick={setSelectedReport}
							navigationTarget={navTarget}
							onUserPosition={setUserPos}
						/>
					</div>

					<div className="flex flex-shrink-0 items-center gap-3.5 overflow-x-auto border-y border-border bg-bg-card px-4 py-2">
						<div className="flex items-center gap-1.5 whitespace-nowrap">
							<span
								className="h-1.5 w-1.5 shrink-0 rounded-full"
								style={{
									background: error ? "var(--danger)" : "var(--success)",
									boxShadow: `0 0 0 3px ${error ? "var(--danger-faint)" : "var(--success-faint)"}`
								}}
							/>
							<span
								className="text-[11px] font-bold tracking-wide"
								style={{ color: error ? "var(--danger)" : "var(--success)" }}>
								{error ? "OFFLINE" : "LIVE"}
							</span>
						</div>
						<StatusChip color="var(--text-muted)" label="ALL" count={reports.length} />
						<StatusChip color="var(--danger)" label="ACTIVE" count={activeCount} />
						<StatusChip color="var(--success)" label="ATTENDED" count={attendedCount} />
					</div>
				</div>

				<div className="feedCol">
					<div className="px-4 pt-3 pb-6">
						<p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
							Live Feed
						</p>
						{loading && (
							<div className="flex justify-center py-6">
								<Spinner size={22} />
							</div>
						)}
						{!loading && !error && feedItems.length === 0 && (
							<p className="py-6 text-center text-sm text-text-dim">No assignments yet</p>
						)}
						{!loading && error && feedItems.length === 0 && (
							<p className="py-6 text-center text-sm text-danger">Could not load assignments</p>
						)}
						{feedItems.map(item => (
							<button
								key={item.key}
								onClick={() => setSelectedReport(item.report)}
								className="flex w-full items-center gap-2.5 border-b border-border py-2.5 text-left">
								<span
									className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full"
									style={{
										width: 26,
										height: 26,
										background: item.attended ? "var(--bg-surface)" : DISASTER_COLORS[item.report.disasterType]
									}}>
									{item.attended ? (
										<IconCircleCheck size={14} className="text-success" />
									) : (
										<DisasterGlyph type={item.report.disasterType} size={13} color="#ffffff" />
									)}
								</span>
								<div className="min-w-0 flex-1">
									<span className="text-xs text-text">
										<span className="font-semibold">{item.label}</span> — {item.report.title}
									</span>
								</div>
								<span className="shrink-0 text-[10px] text-text-muted">
									{formatFeedTime(item.at)}
								</span>
							</button>
						))}
					</div>
				</div>
			</div>

			<ReportDetailDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
				onNavigate={report => {
					handleNavigate(report);
					setSelectedReport(null);
				}}
				onMarkAttended={markAttended}
			/>

			<style jsx>{`
				.mapSplit {
					flex: 1;
					min-height: 0;
					display: flex;
					flex-direction: column;
					overflow-y: auto;
				}
				.mapCol {
					display: flex;
					flex-direction: column;
				}
				.mapArea {
					height: 300px;
					flex-shrink: 0;
					position: relative;
					overflow: hidden;
				}
				.feedCol {
					border-top: 1px solid var(--border);
				}
				@media (min-width: 900px) {
					.mapSplit {
						flex-direction: row;
						overflow: hidden;
					}
					.mapCol {
						flex: 1;
						min-width: 0;
						min-height: 0;
						overflow: hidden;
					}
					.mapArea {
						height: auto;
						flex: 1;
					}
					.feedCol {
						width: 360px;
						flex-shrink: 0;
						border-top: none;
						border-left: 1px solid var(--border);
						height: 100%;
						overflow-y: auto;
					}
				}
			`}</style>
		</div>
	);
}
