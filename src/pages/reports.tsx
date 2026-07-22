import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import {
	Text,
	Badge,
	Stack,
	Group,
	ScrollArea,
	Loader,
	SegmentedControl,
	Select,
	Alert
} from "@mantine/core";
import {
	IconMapPin,
	IconClock,
	IconChevronRight,
	IconCircleCheck,
	IconAlertCircle,
	IconArrowsSort
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import { label } from "@/lib/api";
import { useResponderReports } from "@/lib/useResponderReports";
import { useGeolocation } from "@/lib/useGeolocation";
import { haversineKm } from "@/utils/routing";
import ReportDetailDrawer from "@/components/ReportDetailDrawer";
import TopNav from "@/components/TopNav";

function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m away`;
	return `${km.toFixed(1)} km away`;
}

const URGENCY_COLORS: Record<string, string> = {
	critical: "red",
	high: "orange",
	medium: "yellow",
	low: "green"
};

function formatRelative(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const d = Math.floor(diff / 86400000);
	const h = Math.floor((diff % 86400000) / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	if (d > 0) return `${d}d ${h}h ago`;
	if (h > 0) return `${h}h ${m}m ago`;
	return `${m}m ago`;
}

type StatusFilter = "all" | "assigned" | "attended";
type DamageFilter = "all" | "minimal" | "partial" | "complete";
type SortOrder = "newest" | "oldest";

export default function ReportsPage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const { reports, loading, error, failedCount, markAttended } = useResponderReports();
	const userPos = useGeolocation();
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [damageFilter, setDamageFilter] = useState<DamageFilter>("all");
	const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
	const [selectedReport, setSelectedReport] = useState<CrisisReport | null>(null);

	useEffect(() => {
		if (!isLoading && !responder) router.replace("/login");
	}, [responder, isLoading, router]);

	const handleNavigate = useCallback((_report: CrisisReport) => {
		router.push("/map");
	}, [router]);

	const visible = useMemo(() => {
		let list = reports;
		if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
		if (damageFilter !== "all") list = list.filter(r => r.damageLevel === damageFilter);
		return [...list].sort((a, b) => {
			const d = new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
			return sortOrder === "newest" ? d : -d;
		});
	}, [reports, statusFilter, damageFilter, sortOrder]);

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
		<div
			style={{
				height: "100dvh",
				display: "flex",
				flexDirection: "column",
				background: "var(--cc-bg)",
				paddingTop: 64
			}}>
			<TopNav />

			{/* Header */}
			<div
				style={{
					padding: "16px 16px 12px",
					borderBottom: "1px solid var(--cc-border)",
					background: "var(--cc-bg)",
					flexShrink: 0
				}}>
				<Text fw={700} size="lg" mb={12} style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
					Assigned Reports
				</Text>
				<SegmentedControl
					fullWidth
					size="xs"
					radius="xl"
					color="gold"
					value={statusFilter}
					onChange={v => setStatusFilter(v as StatusFilter)}
					data={[
						{ label: "All", value: "all" },
						{ label: "Active", value: "assigned" },
						{ label: "Attended", value: "attended" }
					]}
					styles={{
						root: { background: "var(--cc-panel)" }
					}}
				/>
				<Group gap={8} mt={10} wrap="nowrap">
					<Select
						size="xs"
						radius="xl"
						value={damageFilter}
						onChange={v => setDamageFilter((v ?? "all") as DamageFilter)}
						data={[
							{ value: "all", label: "All damage levels" },
							{ value: "minimal", label: "Minimal" },
							{ value: "partial", label: "Partial" },
							{ value: "complete", label: "Complete" }
						]}
						style={{ flex: 1 }}
						comboboxProps={{ withinPortal: true }}
						styles={{
							input: { background: "var(--cc-panel)", borderColor: "var(--cc-border)", color: "var(--cc-text)" }
						}}
					/>
					<Select
						size="xs"
						radius="xl"
						value={sortOrder}
						onChange={v => setSortOrder((v ?? "newest") as SortOrder)}
						leftSection={<IconArrowsSort size={13} />}
						data={[
							{ value: "newest", label: "Newest first" },
							{ value: "oldest", label: "Oldest first" }
						]}
						style={{ flex: 1 }}
						comboboxProps={{ withinPortal: true }}
						styles={{
							input: { background: "var(--cc-panel)", borderColor: "var(--cc-border)", color: "var(--cc-text)" }
						}}
					/>
				</Group>
			</div>

			{/* List */}
			<ScrollArea style={{ flex: 1 }}>
				<Stack gap={0} px={16} pt={12} pb={24}>
					{error && (
						<Alert
							icon={<IconAlertCircle size={16} />}
							color="red"
							variant="light"
							radius="md"
							mb={10}>
							{error}
						</Alert>
					)}
					{!error && failedCount > 0 && (
						<Alert
							icon={<IconAlertCircle size={16} />}
							color="yellow"
							variant="light"
							radius="md"
							mb={10}>
							{failedCount} assignment{failedCount === 1 ? "" : "s"} could not load report details
						</Alert>
					)}
					{loading && (
						<Group justify="center" py={40}>
							<Loader color="gold" size="sm" />
						</Group>
					)}
					{!loading && !error && visible.length === 0 && (
						<Text size="sm" c="dimmed" ta="center" py={40}>
							{reports.length === 0 ? "No assignments yet" : "No reports match these filters"}
						</Text>
					)}
					{visible.map(report => (
						<button
							key={report.id}
							onClick={() => setSelectedReport(report)}
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
							{/* Urgency dot */}
							<div
								style={{
									width: 10,
									height: 10,
									borderRadius: "50%",
									background:
										report.status === "attended"
											? "var(--cc-text-muted)"
											: ({
													critical: "#ef4444",
													high: "#f97316",
													medium: "#eab308",
													low: "#22c55e"
												}[report.urgency] ?? "#9ca3af"),
									marginTop: 4,
									flexShrink: 0
								}}
							/>

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
										{report.title}
									</Text>
									<Group gap={4} style={{ flexShrink: 0 }}>
										{report.damageLevel && (
											<Badge color="gray" variant="outline" size="xs">
												{label(report.damageLevel)}
											</Badge>
										)}
										<Badge
											color={URGENCY_COLORS[report.urgency]}
											variant="light"
											size="xs">
											{report.priority}
										</Badge>
										{report.status === "attended" && (
											<IconCircleCheck size={14} color="#22c55e" />
										)}
									</Group>
								</Group>

								<Group gap={4} mb={2}>
									<IconMapPin size={12} color="var(--cc-text-muted)" />
									<Text
										size="xs"
										c="dimmed"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										}}>
										{report.address}
									</Text>
								</Group>

								<Group gap={4} wrap="nowrap">
									<IconClock size={12} color="var(--cc-text-muted)" />
									<Text size="xs" c="dimmed">
										{formatRelative(report.reportedAt)}
									</Text>
									{userPos && (
										<>
											<Text size="xs" c="dimmed">·</Text>
											<Text size="xs" c="dimmed">
												{formatDistance(haversineKm(userPos, [report.location.lat, report.location.lng]))}
											</Text>
										</>
									)}
								</Group>
							</div>

							<IconChevronRight size={16} color="var(--cc-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
						</button>
					))}
				</Stack>
			</ScrollArea>

			<ReportDetailDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
				onNavigate={handleNavigate}
				onMarkAttended={markAttended}
			/>
		</div>
	);
}
