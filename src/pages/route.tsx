import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Text, Badge, Loader, ScrollArea, Stack, Group } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import { buildMultiStopRoute } from "@/utils/routing";
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

const URGENCY_COLORS: Record<string, string> = {
	critical: "red",
	high: "orange",
	medium: "yellow",
	low: "green"
};

export default function RoutePage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const [reports, setReports] = useState<CrisisReport[]>([]);
	const [selectedReport, setSelectedReport] = useState<CrisisReport | null>(null);
	const [userPos, setUserPos] = useState<[number, number] | null>(null);
	const [orderedStops, setOrderedStops] = useState<CrisisReport[]>([]);
	const [route, setRoute] = useState<[number, number][]>([]);
	const [computing, setComputing] = useState(false);

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

	useEffect(() => {
		const assigned = reports.filter(r => r.status === "assigned");
		if (!userPos || assigned.length === 0) {
			setOrderedStops([]);
			setRoute([]);
			return;
		}
		let cancelled = false;
		setComputing(true);
		buildMultiStopRoute(userPos, assigned)
			.then(({ order, route }) => {
				if (cancelled) return;
				setOrderedStops(order);
				setRoute(route);
			})
			.catch(err => console.error("Failed to build route:", err))
			.finally(() => {
				if (!cancelled) setComputing(false);
			});
		return () => {
			cancelled = true;
		};
	}, [userPos, reports]);

	const handleNavigate = useCallback((_report: CrisisReport) => {
		router.push("/map");
	}, [router]);

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

	return (
		<div style={{ height: "100dvh", display: "flex", flexDirection: "column", paddingTop: 64 }}>
			<TopNav />

			{/* Header */}
			<div
				style={{
					height: 52,
					background: "var(--cc-bg)",
					borderBottom: "1px solid var(--cc-border)",
					display: "flex",
					alignItems: "center",
					padding: "0 16px",
					gap: 8,
					flexShrink: 0,
					zIndex: 20
				}}>
				<Text fw={700} size="sm" style={{ flex: 1, fontFamily: "'Big Shoulders Display', sans-serif" }}>
					Optimized Route
				</Text>
				{computing ? (
					<Loader color="gold" size="xs" />
				) : (
					<Badge color="gold" variant="filled" size="sm">
						{orderedStops.length} stop{orderedStops.length === 1 ? "" : "s"}
					</Badge>
				)}
			</div>

			{/* Map */}
			<div style={{ height: "45%", overflow: "hidden", position: "relative", flexShrink: 0 }}>
				<ResponderMap
					reports={orderedStops}
					onReportClick={setSelectedReport}
					navigationTarget={route.length > 0 ? { report: orderedStops[0], route } : null}
					onUserPosition={setUserPos}
				/>
			</div>

			{/* Ordered stop list */}
			<ScrollArea style={{ flex: 1 }}>
				<Stack gap={0} px={16} pt={12} pb={24}>
					{!userPos && (
						<Text size="sm" c="dimmed" ta="center" py={40}>
							Waiting for your location…
						</Text>
					)}
					{userPos && orderedStops.length === 0 && (
						<Text size="sm" c="dimmed" ta="center" py={40}>
							No active reports to route
						</Text>
					)}
					{orderedStops.map((stop, i) => (
						<button
							key={stop.id}
							onClick={() => setSelectedReport(stop)}
							style={{
								width: "100%",
								background: "var(--cc-panel)",
								border: "1px solid var(--cc-border)",
								borderRadius: 12,
								padding: "14px 12px",
								marginBottom: 10,
								cursor: "pointer",
								textAlign: "left",
								display: "flex",
								alignItems: "flex-start",
								gap: 12
							}}>
							<div
								style={{
									width: 22,
									height: 22,
									borderRadius: "50%",
									background: "var(--cc-accent)",
									color: "#151515",
									fontSize: 11,
									fontWeight: 700,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
									marginTop: 1
								}}>
								{i + 1}
							</div>

							<div style={{ flex: 1, minWidth: 0 }}>
								<Group justify="space-between" mb={4} wrap="nowrap">
									<Text
										fw={600}
										size="sm"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											flex: 1
										}}>
										{stop.title}
									</Text>
									<Badge color={URGENCY_COLORS[stop.urgency]} variant="light" size="xs">
										{stop.urgency}
									</Badge>
								</Group>
								<Group gap={4}>
									<IconMapPin size={12} color="var(--cc-text-muted)" />
									<Text
										size="xs"
										c="dimmed"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										}}>
										{stop.address}
									</Text>
								</Group>
							</div>
						</button>
					))}
				</Stack>
			</ScrollArea>

			<ReportDetailDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
				onNavigate={handleNavigate}
				onMarkAttended={handleMarkAttended}
			/>
		</div>
	);
}
