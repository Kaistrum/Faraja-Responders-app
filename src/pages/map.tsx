import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Text, ActionIcon, Loader, Group, Stack } from "@mantine/core";
import { IconX, IconNavigation, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport, DISASTER_COLORS } from "@/types";
import { DisasterGlyph } from "@/components/icons";
import { fetchRoute, NavigationTarget } from "@/utils/routing";
import ReportDetailDrawer from "@/components/ReportDetailDrawer";
import TopNav from "@/components/TopNav";

const ResponderMap = dynamic(() => import("@/components/ResponderMap"), {
	ssr: false,
	loading: () => (
		<div
			style={{
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "var(--cc-panel)"
			}}>
			<Loader color="gold" size="sm" />
		</div>
	)
});

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
	return (
		<div
			style={{
				background: "var(--cc-panel)",
				border: "1px solid var(--cc-border)",
				borderRadius: 10,
				padding: "10px 6px",
				flex: 1,
				textAlign: "center"
			}}>
			<Text
				fw={700}
				size="lg"
				style={{ color: color ?? "var(--cc-text)", fontFamily: "'Big Shoulders Display', sans-serif" }}>
				{value}
			</Text>
			<Text size="10px" tt="uppercase" style={{ color: "var(--cc-text-muted)", letterSpacing: 0.3 }}>
				{label}
			</Text>
		</div>
	);
}

function StatusChip({ color, label, count }: { color: string; label: string; count: number }) {
	return (
		<Group gap={5} wrap="nowrap">
			<span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
			<Text size="11px" style={{ color: "var(--cc-text-dim)" }}>
				{label} <Text span fw={700} style={{ color: "var(--cc-text)" }}>{count}</Text>
			</Text>
		</Group>
	);
}

function formatFeedTime(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const h = Math.floor(diff / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	if (h > 0) return `${h}h ago`;
	if (m > 0) return `${m}m ago`;
	return "just now";
}

export default function MapPage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const [reports, setReports] = useState<CrisisReport[]>([]);
	const [selectedReport, setSelectedReport] = useState<CrisisReport | null>(null);
	const [navTarget, setNavTarget] = useState<NavigationTarget | null>(null);
	const [userPos, setUserPos] = useState<[number, number] | null>(null);

	useEffect(() => {
		if (!isLoading && !responder) router.replace("/login");
	}, [responder, isLoading, router]);

	useEffect(() => {
		if (!responder) return;
		fetch("/api/reports")
			.then(res => res.json())
			.then(setReports)
			.catch(err => console.error("Failed to load reports:", err));
	}, [responder]);

	const handleNavigate = useCallback(
		async (report: CrisisReport) => {
			const from: [number, number] = userPos ?? [-1.2921, 36.8219];
			const to: [number, number] = [report.location.lat, report.location.lng];
			const route = await fetchRoute(from, to);
			setNavTarget({ report, route });
		},
		[userPos]
	);

	const handleMarkAttended = useCallback(
		(report: CrisisReport, notes: string) => {
			setReports(prev =>
				prev.map(r =>
					r.id === report.id
						? {
								...r,
								status: "attended" as const,
								attendedAt: new Date().toISOString(),
								notes
							}
						: r
				)
			);
			fetch(`/api/reports/${report.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes })
			}).catch(err => console.error("Failed to mark report attended:", err));
		},
		[]
	);

	if (isLoading || !responder) {
		return (
			<div
				style={{
					height: "100dvh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--cc-bg)"
				}}>
				<Loader color="gold" />
			</div>
		);
	}

	const activeCount = reports.filter(r => r.status === "assigned").length;
	const attendedCount = reports.filter(r => r.status === "attended").length;

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
		<div style={{ height: "100dvh", display: "flex", flexDirection: "column", paddingTop: 64, background: "var(--cc-bg)" }}>
			<TopNav />

			<div className="mapSplit">
				{/* Left: stats + map + status strip */}
				<div className="mapCol">
					<Group gap={8} px={16} py={12} wrap="nowrap" style={{ flexShrink: 0 }}>
						<StatCard label="Total" value={String(reports.length)} />
						<StatCard label="Active" value={String(activeCount)} color="#ef4444" />
						<StatCard label="Attended" value={String(attendedCount)} color="#4caf6a" />
						<StatCard label="Avg. Resp." value={responder.stats.avgResponseTime} color="var(--cc-accent)" />
					</Group>

					{navTarget && (
						<div
							style={{
								background: "var(--cc-panel)",
								color: "var(--cc-text)",
								padding: "10px 16px",
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexShrink: 0,
								zIndex: 20
							}}>
							<IconNavigation size={16} color="var(--cc-accent)" />
							<Text size="sm" fw={500} style={{ flex: 1, color: "var(--cc-text)" }}>
								Navigating → {navTarget.report.title}
							</Text>
							<ActionIcon
								variant="subtle"
								size="sm"
								onClick={() => setNavTarget(null)}
								style={{ color: "var(--cc-text)" }}>
								<IconX size={16} />
							</ActionIcon>
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

					<Group
						gap={14}
						px={16}
						py={8}
						wrap="nowrap"
						style={{
							flexShrink: 0,
							borderTop: "1px solid var(--cc-border)",
							borderBottom: "1px solid var(--cc-border)",
							background: "var(--cc-panel)",
							overflowX: "auto"
						}}>
						<Group gap={5} wrap="nowrap">
							<span
								style={{
									width: 7,
									height: 7,
									borderRadius: "50%",
									background: "#4caf6a",
									flexShrink: 0,
									boxShadow: "0 0 0 3px rgba(76,175,106,0.25)"
								}}
							/>
							<Text size="11px" fw={700} style={{ color: "#4caf6a", letterSpacing: 0.5 }}>
								LIVE
							</Text>
						</Group>
						<StatusChip color="var(--cc-text-muted)" label="ALL" count={reports.length} />
						<StatusChip color="#ef4444" label="ACTIVE" count={activeCount} />
						<StatusChip color="#4caf6a" label="ATTENDED" count={attendedCount} />
					</Group>
				</div>

				{/* Right (desktop) / below (mobile): live feed */}
				<div className="feedCol">
					<Stack gap={0} px={16} pt={12} pb={24}>
						<Text size="xs" fw={700} tt="uppercase" mb={8} style={{ color: "var(--cc-text-muted)", letterSpacing: 0.4 }}>
							Live Feed
						</Text>
						{feedItems.length === 0 && (
							<Text size="sm" c="dimmed" ta="center" py={24}>
								No activity yet
							</Text>
						)}
						{feedItems.map(item => (
							<button
								key={item.key}
								onClick={() => setSelectedReport(item.report)}
								style={{
									width: "100%",
									background: "none",
									border: "none",
									borderBottom: "1px solid var(--cc-border)",
									padding: "10px 2px",
									cursor: "pointer",
									textAlign: "left",
									display: "flex",
									alignItems: "center",
									gap: 10
								}}>
								<span
									style={{
										width: 26,
										height: 26,
										borderRadius: "50%",
										background: item.attended ? "var(--cc-hover)" : DISASTER_COLORS[item.report.disasterType],
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0
									}}>
									{item.attended ? (
										<IconCircleCheck size={14} color="#4caf6a" />
									) : (
										<DisasterGlyph type={item.report.disasterType} size={13} color="#ffffff" />
									)}
								</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<Text size="xs" style={{ color: "var(--cc-text)" }}>
										<Text span fw={600}>
											{item.label}
										</Text>{" "}
										— {item.report.title}
									</Text>
								</div>
								<Text size="10px" style={{ color: "var(--cc-text-muted)", flexShrink: 0 }}>
									{formatFeedTime(item.at)}
								</Text>
							</button>
						))}
					</Stack>
				</div>
			</div>

			<ReportDetailDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
				onNavigate={report => {
					handleNavigate(report);
					setSelectedReport(null);
				}}
				onMarkAttended={handleMarkAttended}
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
					border-top: 1px solid var(--cc-border);
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
						border-left: 1px solid var(--cc-border);
						height: 100%;
						overflow-y: auto;
					}
				}
			`}</style>
		</div>
	);
}
