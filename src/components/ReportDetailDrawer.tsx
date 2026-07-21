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
	Tabs,
	Divider,
	ActionIcon
} from "@mantine/core";
import {
	IconMapPin,
	IconClock,
	IconUser,
	IconAlertTriangle,
	IconCircleCheck,
	IconNavigation,
	IconX,
	IconPhoto
} from "@tabler/icons-react";
import { CrisisReport } from "@/types";

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
								{report.urgency}
							</Badge>
							{isAttended && (
								<Badge color="gray" variant="light" size="sm">
									Attended
								</Badge>
							)}
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
					<Tabs defaultValue="overview" color="gold">
						<Tabs.List grow mb={12}>
							<Tabs.Tab value="overview">Overview</Tabs.Tab>
							<Tabs.Tab value="survey">Survey</Tabs.Tab>
							<Tabs.Tab value="images" leftSection={<IconPhoto size={14} />}>
								Images ({report.images.length})
							</Tabs.Tab>
						</Tabs.List>

						{/* Overview */}
						<Tabs.Panel value="overview">
							<Stack gap={12}>
								<Group gap={8}>
									<IconUser size={16} color="var(--cc-text-muted)" />
									<Text size="sm">
										<Text span fw={500}>
											Reporter:
										</Text>{" "}
										{report.reporter}
									</Text>
								</Group>

								<Group gap={8}>
									<IconAlertTriangle size={16} color="var(--cc-text-muted)" />
									<Text size="sm">
										<Text span fw={500}>
											Damage:
										</Text>{" "}
										{report.survey.damageLevel}
									</Text>
								</Group>

								<Group gap={8}>
									<IconUser size={16} color="var(--cc-text-muted)" />
									<Text size="sm">
										<Text span fw={500}>
											People affected:
										</Text>{" "}
										~{report.survey.affectedCount}
									</Text>
								</Group>

								<div>
									<Text size="sm" fw={500} mb={6}>
										Infrastructure types
									</Text>
									<Group gap={6}>
										{report.survey.infrastructureTypes.map(t => (
											<Badge key={t} color="gold" variant="light" size="sm">
												{t}
											</Badge>
										))}
									</Group>
								</div>

								{isAttended && report.notes && (
									<div
										style={{
											background: "var(--cc-hover)",
											borderRadius: 8,
											padding: "10px 12px"
										}}>
										<Text size="xs" fw={600} mb={4}>
											Responder Notes
										</Text>
										<Text size="sm">{report.notes}</Text>
									</div>
								)}
							</Stack>
						</Tabs.Panel>

						{/* Survey */}
						<Tabs.Panel value="survey">
							<Stack gap={14}>
								<div>
									<Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
										Description
									</Text>
									<Text size="sm">{report.survey.description}</Text>
								</div>
								<Divider color="var(--cc-border)" />
								<Group justify="space-between">
									<Text size="sm" fw={500}>
										Debris present
									</Text>
									<Badge
										color={report.survey.debrisPresent ? "red" : "green"}
										variant="light"
										size="sm">
										{report.survey.debrisPresent ? "Yes" : "No"}
									</Badge>
								</Group>
								<Divider color="var(--cc-border)" />
								<Group justify="space-between">
									<Text size="sm" fw={500}>
										Damage level
									</Text>
									<Text size="sm">{report.survey.damageLevel}</Text>
								</Group>
								<Divider color="var(--cc-border)" />
								<Group justify="space-between">
									<Text size="sm" fw={500}>
										Affected people
									</Text>
									<Text size="sm">{report.survey.affectedCount}</Text>
								</Group>
							</Stack>
						</Tabs.Panel>

						{/* Images */}
						<Tabs.Panel value="images">
							{report.images.length === 0 ? (
								<Text size="sm" c="dimmed" ta="center" py={24}>
									No images attached
								</Text>
							) : (
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 8
									}}>
									{report.images.map((src, i) => (
										<img
											key={i}
											src={src}
											alt={`Report image ${i + 1}`}
											style={{
												width: "100%",
												aspectRatio: "4/3",
												objectFit: "cover",
												borderRadius: 8,
												display: "block"
											}}
										/>
									))}
								</div>
							)}
						</Tabs.Panel>
					</Tabs>
				</ScrollArea>

				{/* Footer actions */}
				<div
					style={{
						padding: "12px 16px",
						background: "var(--cc-panel)",
						borderTop: "1px solid #e5e3db",
						position: "sticky",
						bottom: 0
					}}>
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
