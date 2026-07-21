import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
	Text,
	Badge,
	Stack,
	Group,
	ScrollArea,
	Loader,
	SegmentedControl
} from "@mantine/core";
import {
	IconMapPin,
	IconClock,
	IconChevronRight,
	IconCircleCheck
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import ReportDetailDrawer from "@/components/ReportDetailDrawer";
import TopNav from "@/components/TopNav";

const URGENCY_COLORS: Record<string, string> = {
	critical: "red",
	high: "orange",
	medium: "yellow",
	low: "green"
};

function formatRelative(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const h = Math.floor(diff / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	if (h > 0) return `${h}h ${m}m ago`;
	return `${m}m ago`;
}

export default function ReportsPage() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();
	const [reports, setReports] = useState<CrisisReport[]>([]);
	const [filter, setFilter] = useState<"all" | "assigned" | "attended">("all");
	const [selectedReport, setSelectedReport] = useState<CrisisReport | null>(
		null
	);

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

	const visible =
		filter === "all" ? reports : reports.filter(r => r.status === filter);

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
					value={filter}
					onChange={v => setFilter(v as typeof filter)}
					data={[
						{ label: "All", value: "all" },
						{ label: "Active", value: "assigned" },
						{ label: "Attended", value: "attended" }
					]}
					styles={{
						root: { background: "var(--cc-panel)" }
					}}
				/>
			</div>

			{/* List */}
			<ScrollArea style={{ flex: 1 }}>
				<Stack gap={0} px={16} pt={12} pb={24}>
					{visible.length === 0 && (
						<Text size="sm" c="dimmed" ta="center" py={40}>
							No reports in this category
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
										<Badge
											color={URGENCY_COLORS[report.urgency]}
											variant="light"
											size="xs">
											{report.urgency}
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

								<Group gap={4}>
									<IconClock size={12} color="var(--cc-text-muted)" />
									<Text size="xs" c="dimmed">
										{formatRelative(report.reportedAt)}
									</Text>
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
				onMarkAttended={handleMarkAttended}
			/>
		</div>
	);
}
