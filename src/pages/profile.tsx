import { useEffect } from "react";
import { useRouter } from "next/router";
import { Card, Badge, Button, Spinner } from "@kaistrum/stratum-ui";
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
	icon: React.ComponentType<{ size: number; className?: string }>;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
			<Icon size={18} className="shrink-0 text-text-muted" />
			<div className="min-w-0">
				<p className="mb-0.5 text-xs text-text-dim">{rowLabel}</p>
				<p className="break-words text-sm font-medium text-text">{value}</p>
			</div>
		</div>
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
			<div className="flex h-[100dvh] items-center justify-center bg-bg">
				<Spinner size={28} />
			</div>
		);
	}

	return (
		<div className="min-h-[100dvh] bg-bg pt-16 pb-6">
			<TopNav />

			{/* Header */}
			<div className="border-b border-border px-4 pt-6 pb-5">
				<h1 className="mb-5 text-lg font-bold text-text">Profile</h1>

				<div className="flex items-start gap-4">
					<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent">
						<IconShieldHalf size={28} className="text-text-on-accent" />
					</div>
					<div className="min-w-0">
						<p className="text-lg font-bold leading-tight text-text">{responder.name}</p>
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							<Badge variant="accent" icon={<IconBriefcase size={11} />}>
								{label(responder.role)}
							</Badge>
							<Badge variant={responder.is_active ? "success" : "neutral"}>
								{responder.is_active ? "Active" : "Inactive"}
							</Badge>
						</div>
					</div>
				</div>
			</div>

			{/* Info — only fields the backend actually provides */}
			<div className="p-4">
				<Card surface="card" padding="standard">
					<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-dim">
						Account
					</p>
					<InfoRow icon={IconUser} label="Name" value={responder.name} />
					<InfoRow icon={IconMail} label="Email" value={responder.email} />
					<InfoRow icon={IconBriefcase} label="Role" value={label(responder.role)} />
					<InfoRow icon={IconBuilding} label="Organization" value={responder.organization ?? "—"} />
					<InfoRow icon={IconId} label="Responder ID" value={responder.responder_id} />
				</Card>

				<Button
					variant="outline"
					fullWidth
					icon={<IconLogout size={16} />}
					className="mt-6"
					onClick={logout}>
					Sign Out
				</Button>
			</div>
		</div>
	);
}
