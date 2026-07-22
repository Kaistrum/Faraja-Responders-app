import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { Badge, Select, Alert, Spinner } from "@kaistrum/stratum-ui";
import { IconMapPin, IconClock, IconChevronRight, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import { label } from "@/lib/api";
import { useResponderReports } from "@/lib/useResponderReports";
import { useGeolocation } from "@/lib/useGeolocation";
import { haversineKm } from "@/utils/routing";
import ReportDetailDrawer from "@/components/ReportDetailDrawer";
import TopNav from "@/components/TopNav";

type BadgeVariant = "accent" | "info" | "success" | "warning" | "danger" | "neutral" | "outline";

const URGENCY_VARIANT: Record<string, BadgeVariant> = {
	critical: "danger",
	high: "warning",
	medium: "info",
	low: "success"
};

const URGENCY_DOT: Record<string, string> = {
	critical: "var(--danger)",
	high: "var(--warning)",
	medium: "var(--info)",
	low: "var(--success)"
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

function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m away`;
	return `${km.toFixed(1)} km away`;
}

type StatusFilter = "all" | "assigned" | "attended";
type DamageFilter = "all" | "minimal" | "partial" | "complete";
type SortOrder = "newest" | "oldest";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Active", value: "assigned" },
	{ label: "Attended", value: "attended" }
];

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

	const handleNavigate = useCallback(() => {
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
			<div className="flex h-[100dvh] items-center justify-center bg-bg">
				<Spinner size={28} />
			</div>
		);
	}

	return (
		<div className="flex h-[100dvh] flex-col bg-bg pt-16">
			<TopNav />

			{/* Header */}
			<div className="flex-shrink-0 border-b border-border px-4 pt-4 pb-3">
				<h1 className="mb-3 text-lg font-bold text-text">Assigned Reports</h1>

				{/* Status segmented control */}
				<div className="flex gap-1 rounded-full bg-bg-card p-1">
					{STATUS_TABS.map(tab => (
						<button
							key={tab.value}
							onClick={() => setStatusFilter(tab.value)}
							className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
								statusFilter === tab.value
									? "bg-accent text-text-on-accent"
									: "text-text-dim hover:text-text"
							}`}>
							{tab.label}
						</button>
					))}
				</div>

				<div className="mt-2.5 flex gap-2">
					<Select
						className="flex-1"
						value={damageFilter}
						onChange={e => setDamageFilter(e.currentTarget.value as DamageFilter)}
						options={[
							{ value: "all", label: "All damage levels" },
							{ value: "minimal", label: "Minimal" },
							{ value: "partial", label: "Partial" },
							{ value: "complete", label: "Complete" }
						]}
					/>
					<Select
						className="flex-1"
						value={sortOrder}
						onChange={e => setSortOrder(e.currentTarget.value as SortOrder)}
						options={[
							{ value: "newest", label: "Newest first" },
							{ value: "oldest", label: "Oldest first" }
						]}
					/>
				</div>
			</div>

			{/* List */}
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
					<div className="flex justify-center py-10">
						<Spinner size={22} />
					</div>
				)}
				{!loading && !error && visible.length === 0 && (
					<p className="py-10 text-center text-sm text-text-dim">
						{reports.length === 0 ? "No assignments yet" : "No reports match these filters"}
					</p>
				)}

				<div className="flex flex-col gap-2.5">
					{visible.map(report => (
						<button
							key={report.id}
							onClick={() => setSelectedReport(report)}
							className="flex items-start gap-3 rounded-xl border border-border bg-bg-card p-3 text-left transition-colors hover:border-border-strong">
							<span
								className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
								style={{
									background:
										report.status === "attended" ? "var(--text-muted)" : URGENCY_DOT[report.urgency] ?? "var(--text-muted)"
								}}
							/>
							<div className="min-w-0 flex-1">
								<div className="mb-1 flex items-center justify-between gap-2">
									<span className="flex-1 truncate text-sm font-semibold text-text">
										{report.title}
									</span>
									<span className="flex shrink-0 items-center gap-1">
										{report.damageLevel && (
											<Badge variant="outline">{label(report.damageLevel)}</Badge>
										)}
										<Badge variant={URGENCY_VARIANT[report.urgency] ?? "neutral"}>
											{report.priority}
										</Badge>
										{report.status === "attended" && (
											<IconCircleCheck size={14} className="text-success" />
										)}
									</span>
								</div>
								<div className="mb-0.5 flex items-center gap-1 text-text-dim">
									<IconMapPin size={12} className="text-text-muted" />
									<span className="truncate text-xs">{report.address}</span>
								</div>
								<div className="flex items-center gap-1 text-text-dim">
									<IconClock size={12} className="text-text-muted" />
									<span className="text-xs">{formatRelative(report.reportedAt)}</span>
									{userPos && (
										<>
											<span className="text-xs">·</span>
											<span className="text-xs">
												{formatDistance(haversineKm(userPos, [report.location.lat, report.location.lng]))}
											</span>
										</>
									)}
								</div>
							</div>
							<IconChevronRight size={16} className="mt-0.5 shrink-0 text-text-muted" />
						</button>
					))}
				</div>
			</div>

			<ReportDetailDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
				onNavigate={handleNavigate}
				onMarkAttended={markAttended}
			/>
		</div>
	);
}
