import { useState } from "react";
import { Badge, Button, Textarea, Modal } from "@kaistrum/stratum-ui";
import {
	IconMapPin,
	IconClock,
	IconCircleCheck,
	IconNavigation,
	IconBrandGoogleMaps,
	IconX
} from "@tabler/icons-react";
import { CrisisReport } from "@/types";
import { label } from "@/lib/api";
import { singleDestinationUrl } from "@/utils/routing";

type BadgeVariant = "accent" | "info" | "success" | "warning" | "danger" | "neutral" | "outline";

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
	critical: "danger",
	high: "warning",
	medium: "info",
	low: "success"
};

function formatTime(iso: string) {
	return new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function FieldRow({ name, value }: { name: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
			<span className="shrink-0 text-sm font-medium text-text-dim">{name}</span>
			<span className="min-w-0 text-right text-sm text-text">{value}</span>
		</div>
	);
}

interface ReportDetailDrawerProps {
	report: CrisisReport | null;
	onClose: () => void;
	onNavigate: (report: CrisisReport) => void;
	onMarkAttended: (report: CrisisReport, notes: string) => void;
}

export default function ReportDetailDrawer({
	report,
	onClose,
	onNavigate,
	onMarkAttended
}: ReportDetailDrawerProps) {
	const [attendModalOpen, setAttendModalOpen] = useState(false);
	const [notes, setNotes] = useState("");

	if (!report) return null;

	const isAttended = report.status === "attended";

	const handleMarkAttended = () => {
		onMarkAttended(report, notes);
		setAttendModalOpen(false);
		setNotes("");
		onClose();
	};

	return (
		<>
			{/* Overlay */}
			<div className="fixed inset-0 z-[1100] bg-overlay-bg" onClick={onClose} />

			{/* Bottom sheet */}
			<div className="fixed inset-x-0 bottom-0 z-[1101] flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-bg-card">
				{/* Header */}
				<div className="border-b border-border px-4 pt-4 pb-3">
					<div className="mb-2 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Badge variant={PRIORITY_VARIANT[report.urgency] ?? "neutral"}>
								{report.priority}
							</Badge>
							<Badge variant={isAttended ? "neutral" : "accent"}>
								{label(report.assignmentStatus)}
							</Badge>
						</div>
						<button
							onClick={onClose}
							className="text-text-muted transition-colors hover:text-text"
							aria-label="Close">
							<IconX size={18} />
						</button>
					</div>

					<h2 className="mb-1 text-lg font-bold leading-snug text-text">{report.title}</h2>
					<div className="mb-1 flex items-center gap-1.5 text-text-dim">
						<IconMapPin size={14} className="text-text-muted" />
						<span className="text-xs">{report.address}</span>
					</div>
					<div className="flex items-center gap-1.5 text-text-dim">
						<IconClock size={14} className="text-text-muted" />
						<span className="text-xs">Reported {formatTime(report.reportedAt)}</span>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-4 py-3">
					{report.photoUrl && (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={report.photoUrl}
							alt="Report photo"
							className="mb-3 block aspect-[4/3] w-full rounded-lg object-cover"
						/>
					)}
					<FieldRow name="Nature of crisis" value={label(report.natureOfCrisis)} />
					<FieldRow name="Damage level" value={label(report.damageLevel)} />
					<FieldRow name="Infrastructure" value={label(report.infrastructureType)} />
					<FieldRow
						name="Debris present"
						value={
							<Badge variant={report.debris ? "danger" : "success"}>
								{report.debris ? "Yes" : "No"}
							</Badge>
						}
					/>
					<FieldRow name="Affected units" value={report.affectedUnits ?? "Not recorded"} />
					<FieldRow name="Assigned" value={formatTime(report.assignedAt)} />
					{report.dueDate && <FieldRow name="Due" value={formatTime(report.dueDate)} />}
					{report.attendedAt && <FieldRow name="Completed" value={formatTime(report.attendedAt)} />}

					{report.notes && (
						<div className="mt-3 rounded-lg bg-bg-surface p-3">
							<p className="mb-1 text-xs font-semibold text-text-dim">Notes</p>
							<p className="text-sm text-text">{report.notes}</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex flex-col gap-2 border-t border-border bg-bg-card px-4 py-3">
					<div className="flex gap-2">
						<Button
							variant="outline"
							icon={<IconNavigation size={16} />}
							className="flex-1"
							onClick={() => {
								onNavigate(report);
								onClose();
							}}>
							Navigate
						</Button>
						{!isAttended && (
							<Button
								variant="primary"
								icon={<IconCircleCheck size={16} />}
								className="flex-1"
								onClick={() => setAttendModalOpen(true)}>
								Mark Attended
							</Button>
						)}
					</div>
					<a
						href={singleDestinationUrl([report.location.lat, report.location.lng])}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent">
						<IconBrandGoogleMaps size={16} />
						Open in Google Maps
					</a>
				</div>
			</div>

			{/* Mark-attended confirmation */}
			<Modal
				open={attendModalOpen}
				onClose={() => setAttendModalOpen(false)}
				title="Mark as Attended"
				size="sm">
				<div className="flex flex-col gap-4">
					<p className="text-sm text-text-dim">
						Add any notes about the situation before marking this report as attended.
					</p>
					<Textarea
						placeholder="E.g. Area cordoned off, utility team notified..."
						rows={3}
						value={notes}
						onChange={e => setNotes(e.currentTarget.value)}
					/>
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setAttendModalOpen(false)}>
							Cancel
						</Button>
						<Button variant="primary" onClick={handleMarkAttended}>
							Confirm
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
