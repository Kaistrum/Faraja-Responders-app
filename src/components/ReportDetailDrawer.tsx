import { useState } from "react";
import {
	Drawer,
	Badge,
	Text,
	Group,
	Stack,
	Button,
	Textarea,
	Modal,
	ScrollArea,
	Divider,
	ActionIcon
} from "@mantine/core";
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

const URGENCY_COLORS: Record<string, string> = {
	critical: "red",
	high: "orange",
	medium: "yellow",
	low: "green"
};

function formatTime(iso: string) {
	return new Date(iso).toLocaleString("en-KE", {
		dateStyle: "medium",
		timeStyle: "short"
	});
}

function FieldRow({ name, value }: { name: string; value: React.ReactNode }) {
	return (
		<>
			<Group justify="space-between" wrap="nowrap" gap={12}>
				<Text size="sm" fw={500} style={{ flexShrink: 0 }}>
					{name}
				</Text>
				<Text size="sm" ta="right" style={{ minWidth: 0 }}>
					{value}
				</Text>
			</Group>
			<Divider color="var(--cc-border)" />
		</>
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

	const urgencyColor = URGENCY_COLORS[report.urgency] ?? "gray";
	const isAttended = report.status === "attended";

	const handleMarkAttended = () => {
		onMarkAttended(report, notes);
		setAttendModalOpen(false);
		setNotes("");
		onClose();
	};

	return (
		<>
			<Drawer
				opened={!!report}
				onClose={onClose}
				position="bottom"
				size="85%"
				withCloseButton={false}
				styles={{
					content: {
						borderRadius: "16px 16px 0 0",
						background: "var(--cc-panel)"
					},
					body: { padding: 0, height: "100%" }
				}}>
				{/* Header */}
				<div
					style={{
						padding: "16px 16px 0",
						background: "var(--cc-panel)",
						position: "sticky",
						top: 0,
						zIndex: 10
					}}>
					<Group justify="space-between" mb={8}>
						<Group gap={8}>
							<Badge
								color={urgencyColor}
								variant="filled"
								size="sm"
								tt="uppercase">
								{report.priority}
							</Badge>
							<Badge color={isAttended ? "gray" : "gold"} variant="light" size="sm">
								{label(report.assignmentStatus)}
							</Badge>
						</Group>
						<ActionIcon
							variant="subtle"
							color="gold"
							onClick={onClose}
							size="sm">
							<IconX size={16} />
						</ActionIcon>
					</Group>

					<Text fw={700} size="lg" lh={1.3} mb={4}>
						{report.title}
					</Text>

					<Group gap={6} mb={4}>
						<IconMapPin size={14} color="var(--cc-text-muted)" />
						<Text size="xs" c="dimmed" style={{ flex: 1 }}>
							{report.address}
						</Text>
					</Group>
					<Group gap={6} mb={12}>
						<IconClock size={14} color="var(--cc-text-muted)" />
						<Text size="xs" c="dimmed">
							Reported {formatTime(report.reportedAt)}
						</Text>
					</Group>

					<Divider color="var(--cc-border)" />
				</div>

				<ScrollArea style={{ height: "calc(100% - 220px)" }} px={16} py={12}>
					<Stack gap={10}>
						{report.photoUrl && (
							<img
								src={report.photoUrl}
								alt="Report photo"
								style={{
									width: "100%",
									aspectRatio: "4/3",
									objectFit: "cover",
									borderRadius: 8,
									display: "block"
								}}
							/>
						)}

						<FieldRow name="Nature of crisis" value={label(report.natureOfCrisis)} />
						<FieldRow name="Damage level" value={label(report.damageLevel)} />
						<FieldRow name="Infrastructure" value={label(report.infrastructureType)} />
						<FieldRow
							name="Debris present"
							value={
								<Badge color={report.debris ? "red" : "green"} variant="light" size="sm">
									{report.debris ? "Yes" : "No"}
								</Badge>
							}
						/>
						<FieldRow
							name="Affected units"
							value={report.affectedUnits ?? "Not recorded"}
						/>
						<FieldRow name="Assigned" value={formatTime(report.assignedAt)} />
						{report.dueDate && (
							<FieldRow name="Due" value={formatTime(report.dueDate)} />
						)}
						{report.attendedAt && (
							<FieldRow name="Completed" value={formatTime(report.attendedAt)} />
						)}

						{report.notes && (
							<div
								style={{
									background: "var(--cc-hover)",
									borderRadius: 8,
									padding: "10px 12px"
								}}>
								<Text size="xs" fw={600} mb={4}>
									Notes
								</Text>
								<Text size="sm">{report.notes}</Text>
							</div>
						)}
					</Stack>
				</ScrollArea>

				{/* Footer actions */}
				<div
					style={{
						padding: "12px 16px",
						background: "var(--cc-panel)",
						borderTop: "1px solid var(--cc-border)",
						position: "sticky",
						bottom: 0
					}}>
					<Stack gap={8}>
						<Group gap={8}>
							<Button
								leftSection={<IconNavigation size={16} />}
								variant="outline"
								color="gold"
								radius="xl"
								style={{ flex: 1 }}
								onClick={() => {
									onNavigate(report);
									onClose();
								}}>
								Navigate
							</Button>
							{!isAttended && (
								<Button
									leftSection={<IconCircleCheck size={16} />}
									color="gold"
									radius="xl"
									style={{ flex: 1 }}
									onClick={() => setAttendModalOpen(true)}>
									Mark Attended
								</Button>
							)}
						</Group>
						<Button
							component="a"
							href={singleDestinationUrl([report.location.lat, report.location.lng])}
							target="_blank"
							rel="noopener noreferrer"
							leftSection={<IconBrandGoogleMaps size={16} />}
							variant="light"
							color="gold"
							radius="xl"
							fullWidth>
							Open in Google Maps
						</Button>
					</Stack>
				</div>
			</Drawer>

			{/* Mark attended modal */}
			<Modal
				opened={attendModalOpen}
				onClose={() => setAttendModalOpen(false)}
				title="Mark as Attended"
				centered
				radius="md"
				styles={{ content: { background: "var(--cc-panel)" } }}>
				<Stack gap={16}>
					<Text size="sm" c="dimmed">
						Add any notes about the situation before marking this report as
						attended.
					</Text>
					<Textarea
						placeholder="E.g. Area cordoned off, utility team notified..."
						minRows={3}
						radius="md"
						value={notes}
						onChange={e => setNotes(e.currentTarget.value)}
						styles={{
							input: { background: "var(--cc-panel)", borderColor: "var(--cc-border)", color: "var(--cc-text)" }
						}}
					/>
					<Group justify="flex-end" gap={8}>
						<Button
							variant="subtle"
							color="gold"
							onClick={() => setAttendModalOpen(false)}>
							Cancel
						</Button>
						<Button color="gold" radius="xl" onClick={handleMarkAttended}>
							Confirm
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
}
