import { useEffect } from "react";
import { useRouter } from "next/router";
import { Text, Group, Button, Badge, Loader } from "@mantine/core";
import {
	IconUser,
	IconBuilding,
	IconMail,
	IconLogout,
	IconShieldHalf,
	IconId,
	IconBriefcase
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { label } from "@/lib/api";
import TopNav from "@/components/TopNav";

function InfoRow({
	icon: Icon,
	label: rowLabel,
	value
}: {
	icon: React.ComponentType<{ size: number; color: string }>;
	label: string;
	value: string;
}) {
	return (
		<Group gap={12} py={12} style={{ borderBottom: "1px solid var(--cc-border)" }}>
			<Icon size={18} color="var(--cc-text-muted)" />
			<div style={{ minWidth: 0 }}>
				<Text size="xs" c="dimmed" mb={1}>
					{rowLabel}
				</Text>
				<Text size="sm" fw={500} style={{ wordBreak: "break-word" }}>
					{value}
				</Text>
			</div>
		</Group>
	);
}

export default function ProfilePage() {
	const { responder, isLoading, logout } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !responder) router.replace("/login");
	}, [responder, isLoading, router]);

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
					<div style={{ minWidth: 0 }}>
						<Text fw={700} size="lg" lh={1.2}>
							{responder.name}
						</Text>
						<Group gap={6} mt={6}>
							<Badge color="gold" variant="filled" size="xs" leftSection={<IconBriefcase size={10} />}>
								{label(responder.role)}
							</Badge>
							<Badge color={responder.is_active ? "green" : "gray"} variant="light" size="xs">
								{responder.is_active ? "Active" : "Inactive"}
							</Badge>
						</Group>
					</div>
				</Group>
			</div>

			{/* Info — only fields the backend actually provides */}
			<div style={{ padding: "16px" }}>
				<div
					style={{
						background: "var(--cc-panel)",
						borderRadius: 12,
						padding: "0 12px"
					}}>
					<Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4} mt={8}>
						Account
					</Text>
					<InfoRow icon={IconUser} label="Name" value={responder.name} />
					<InfoRow icon={IconMail} label="Email" value={responder.email} />
					<InfoRow icon={IconBriefcase} label="Role" value={label(responder.role)} />
					<InfoRow
						icon={IconBuilding}
						label="Organization"
						value={responder.organization ?? "—"}
					/>
					<InfoRow icon={IconId} label="Responder ID" value={responder.responder_id} />
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
