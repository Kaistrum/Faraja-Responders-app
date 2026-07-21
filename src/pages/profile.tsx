import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
	Text,
	Stack,
	Group,
	Button,
	Divider,
	Badge,
	Loader
} from "@mantine/core";
import {
	IconUser,
	IconBadge,
	IconBuilding,
	IconPhone,
	IconMail,
	IconLogout,
	IconShieldHalf,
	IconChecklist,
	IconClock,
	IconAlertTriangle
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { CrisisReport } from "@/types";
import TopNav from "@/components/TopNav";

function StatCard({
	icon: Icon,
	label,
	value,
	color = "var(--cc-accent)"
}: {
	icon: React.ComponentType<{ size: number; color: string }>;
	label: string;
	value: string;
	color?: string;
}) {
	return (
		<div
			style={{
				background: "var(--cc-panel)",
				borderRadius: 12,
				padding: "16px 12px",
				flex: 1,
				textAlign: "center",
				border: "1px solid var(--cc-border)"
			}}>
			<Icon size={20} color={color} />
			<Text fw={700} size="xl" mt={6} mb={2} style={{ color }}>
				{value}
			</Text>
			<Text size="xs" c="dimmed">
				{label}
			</Text>
		</div>
	);
}

function InfoRow({
	icon: Icon,
	label,
	value
}: {
	icon: React.ComponentType<{ size: number; color: string }>;
	label: string;
	value: string;
}) {
	return (
		<Group gap={12} py={12} style={{ borderBottom: "1px solid var(--cc-border)" }}>
			<Icon size={18} color="var(--cc-text-muted)" />
			<div>
				<Text size="xs" c="dimmed" mb={1}>
					{label}
				</Text>
				<Text size="sm" fw={500}>
					{value}
				</Text>
			</div>
		</Group>
	);
}

export default function ProfilePage() {
	const { responder, isLoading, logout } = useAuth();
	const router = useRouter();
	const [reports, setReports] = useState<CrisisReport[]>([]);

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

	const activeReports = reports.filter(r => r.status === "assigned").length;
	const attendedReports = reports.filter(
		r => r.status === "attended"
	).length;

	return (
		<div
			style={{
				minHeight: "100dvh",
				background: "var(--cc-bg)",
				paddingTop: 64,
				paddingBottom: 24
			}}>
			<TopNav />

			{/* Header */}
			<div
				style={{
					padding: "24px 16px 20px",
					borderBottom: "1px solid var(--cc-border)"
				}}>
				<Text fw={700} size="lg" mb={20} style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
					Profile
				</Text>

				{/* Avatar */}
				<Group gap={16} align="flex-start">
					<div
						style={{
							width: 64,
							height: 64,
							borderRadius: "50%",
							background: "var(--cc-accent)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0
						}}>
						<IconShieldHalf size={28} color="#151515" />
					</div>
					<div>
						<Text fw={700} size="lg" lh={1.2}>
							{responder.name}
						</Text>
						<Group gap={6} mt={4}>
							<Badge
								color="gold"
								variant="filled"
								size="xs"
								leftSection={<IconBadge size={10} />}>
								{responder.badge}
							</Badge>
						</Group>
						<Text size="xs" c="dimmed" mt={4}>
							{responder.department}
						</Text>
					</div>
				</Group>
			</div>

			{/* Stats */}
			<div style={{ padding: "16px" }}>
				<Group grow gap={8} mb={20}>
					<StatCard
						icon={IconChecklist}
						label="Attended"
						value={String(responder.stats.reportsAttended + attendedReports)}
					/>
					<StatCard
						icon={IconClock}
						label="Avg. Response"
						value={responder.stats.avgResponseTime}
					/>
					<StatCard
						icon={IconAlertTriangle}
						label="Active"
						value={String(activeReports)}
						color="#ef4444"
					/>
				</Group>

				{/* Info */}
				<div
					style={{
						background: "var(--cc-panel)",
						borderRadius: 12,
						padding: "0 4px"
					}}>
					<Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4} mt={4}>
						Contact
					</Text>
					<InfoRow icon={IconPhone} label="Phone" value={responder.phone} />
					<InfoRow icon={IconMail} label="Email" value={responder.email} />
				</div>

				<div
					style={{
						background: "var(--cc-panel)",
						borderRadius: 12,
						padding: "0 4px",
						marginTop: 16
					}}>
					<Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4} mt={4}>
						Unit
					</Text>
					<InfoRow
						icon={IconBuilding}
						label="Department"
						value={responder.department}
					/>
					<InfoRow icon={IconBadge} label="Badge No." value={responder.badge} />
					<InfoRow icon={IconUser} label="ID" value={responder.id} />
				</div>

				<Button
					fullWidth
					variant="outline"
					color="gold"
					radius="xl"
					leftSection={<IconLogout size={16} />}
					mt={24}
					onClick={logout}>
					Sign Out
				</Button>
			</div>
		</div>
	);
}
