import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import {
	Text,
	Badge,
	Loader,
	ScrollArea,
	Stack,
	Group,
	Checkbox,
	Button,
	Alert,
	CopyButton,
	Modal,
	ActionIcon
} from "@mantine/core";
import {
	IconMapPin,
	IconAlertCircle,
	IconExternalLink,
	IconCopy,
	IconCheck,
	IconQrcode,
	IconX
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
		<Stack gap={6} align="center">
			<canvas
				ref={ref}
				width={240}
				height={240}
				style={{ width: 240, height: 240, borderRadius: 8, background: "#fff", display: err ? "none" : "block" }}
			/>
			{err && (
				<Text size="xs" c="red" ta="center">
					{err}
				</Text>
			)}
		</Stack>
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

	const activeReports = useMemo(
		() => reports.filter(r => r.status === "assigned"),
		[reports]
	);

	// Drop any selected ids that are no longer active (e.g. after polling).
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

	const navTarget = optimized && optimized.order.length > 0
		? { report: optimized.order[0], route: optimized.route }
		: null;

	return (
		<div style={{ height: "100dvh", display: "flex", flexDirection: "column", paddingTop: 64 }}>
			<TopNav />

			{/* Header */}
			<div
				style={{
					minHeight: 52,
					background: "var(--cc-bg)",
					borderBottom: "1px solid var(--cc-border)",
					display: "flex",
					alignItems: "center",
					padding: "8px 16px",
					gap: 8,
					flexShrink: 0,
					zIndex: 20
				}}>
				<Text fw={700} size="sm" style={{ flex: 1, fontFamily: "'Big Shoulders Display', sans-serif" }}>
					Optimized Route
				</Text>
				{optimized && (
					<Badge color="gold" variant="filled" size="sm">
						{optimized.order.length} stop{optimized.order.length === 1 ? "" : "s"} · {optimized.totalKm.toFixed(1)} km
					</Badge>
				)}
			</div>

			{/* Map */}
			<div style={{ height: "40%", overflow: "hidden", position: "relative", flexShrink: 0 }}>
				<ResponderMap
					reports={optimized ? optimized.order : selectedStops}
					onReportClick={() => {}}
					navigationTarget={navTarget}
					onUserPosition={setUserPos}
				/>
			</div>

			{/* Controls + list */}
			<ScrollArea style={{ flex: 1 }}>
				<Stack gap={0} px={16} pt={12} pb={24}>
					{error && (
						<Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md" mb={10}>
							{error}
						</Alert>
					)}
					{!error && failedCount > 0 && (
						<Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" radius="md" mb={10}>
							{failedCount} assignment{failedCount === 1 ? "" : "s"} could not load report details
						</Alert>
					)}

					{loading && (
						<Group justify="center" py={30}>
							<Loader color="gold" size="sm" />
						</Group>
					)}

					{!loading && !error && activeReports.length === 0 && (
						<Text size="sm" c="dimmed" ta="center" py={30}>
							No active assignments to route
						</Text>
					)}

					{!loading && activeReports.length > 0 && (
						<>
							<Group justify="space-between" mb={8}>
								<Checkbox
									label="Select all"
									color="gold"
									checked={allSelected}
									indeterminate={selectedIds.size > 0 && !allSelected}
									onChange={toggleAll}
									styles={{ label: { fontWeight: 600, fontSize: 13 } }}
								/>
								<Text size="xs" c="dimmed">
									{selectedIds.size} selected
								</Text>
							</Group>

							{!userPos && selectedIds.size > 0 && (
								<Alert color="yellow" variant="light" radius="md" mb={10} icon={<IconMapPin size={16} />}>
									Waiting for your location to compute the route…
								</Alert>
							)}

							{/* Google Maps hand-off */}
							{optimized && mapsLegs.length > 0 && (
								<Stack gap={8} mb={12}>
									{mapsLegs.length > 1 && (
										<Text size="xs" c="dimmed">
											Google Maps limits stops per link, so this route is split into {mapsLegs.length} legs.
										</Text>
									)}
									{mapsLegs.map((leg, i) => (
										<div
											key={i}
											style={{
												background: "var(--cc-panel)",
												border: "1px solid var(--cc-border)",
												borderRadius: 10,
												padding: "10px 12px"
											}}>
											<Group justify="space-between" mb={6}>
												<Text size="xs" fw={600}>
													{mapsLegs.length > 1 ? `Leg ${i + 1}: stops ${leg.fromStop}–${leg.toStop}` : "Full route"}
												</Text>
											</Group>
											<Group gap={6} wrap="nowrap">
												<Button
													component="a"
													href={leg.url}
													target="_blank"
													rel="noopener noreferrer"
													size="xs"
													color="gold"
													radius="xl"
													leftSection={<IconExternalLink size={14} />}
													style={{ flex: 1 }}>
													Open
												</Button>
												<CopyButton value={leg.url}>
													{({ copied, copy }) => (
														<Button
															size="xs"
															variant="light"
															color={copied ? "green" : "gold"}
															radius="xl"
															onClick={copy}
															leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
															style={{ flex: 1 }}>
															{copied ? "Copied" : "Copy"}
														</Button>
													)}
												</CopyButton>
												<ActionIcon
													variant="light"
													color="gold"
													radius="xl"
													size="lg"
													onClick={() => setQrLeg(leg)}
													aria-label="Show QR code">
													<IconQrcode size={16} />
												</ActionIcon>
											</Group>
										</div>
									))}
								</Stack>
							)}

							{/* Ordered / selectable stop list */}
							<Stack gap={8}>
								{activeReports.map(report => {
									const orderIndex = optimized
										? optimized.order.findIndex(s => s.id === report.id)
										: -1;
									const checked = selectedIds.has(report.id);
									return (
										<div
											key={report.id}
											style={{
												background: "var(--cc-panel)",
												border: "1px solid var(--cc-border)",
												borderRadius: 12,
												padding: "12px",
												display: "flex",
												alignItems: "flex-start",
												gap: 10
											}}>
											<Checkbox
												color="gold"
												checked={checked}
												onChange={() => toggle(report.id)}
												mt={2}
											/>
											{orderIndex >= 0 && (
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
													{orderIndex + 1}
												</div>
											)}
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
													<Badge color={URGENCY_COLORS[report.urgency]} variant="light" size="xs">
														{report.priority}
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
														{report.address}
													</Text>
												</Group>
											</div>
										</div>
									);
								})}
							</Stack>
						</>
					)}
				</Stack>
			</ScrollArea>

			<Modal
				opened={!!qrLeg}
				onClose={() => setQrLeg(null)}
				title="Scan to open in Google Maps"
				centered
				radius="md"
				styles={{ content: { background: "var(--cc-panel)" } }}>
				{qrLeg && (
					<Stack gap={12} align="center">
						<QrCanvas url={qrLeg.url} />
						<Text size="xs" c="dimmed" ta="center">
							Point your phone camera at the code to open the directions.
						</Text>
					</Stack>
				)}
			</Modal>
		</div>
	);
}
