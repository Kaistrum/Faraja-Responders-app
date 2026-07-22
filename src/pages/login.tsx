import { useState } from "react";
import { useRouter } from "next/router";
import {
	TextInput,
	PasswordInput,
	Button,
	Text,
	Stack,
	Alert
} from "@mantine/core";
import { IconShieldHalf, IconAlertCircle } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await login(email.trim(), password);
			router.push("/map");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: "100dvh",
				background: "var(--cc-bg)",
				display: "flex",
				flexDirection: "column"
			}}>
			{/* Top bar */}
			<div
				style={{
					height: 64,
					flexShrink: 0,
					borderBottom: "1px solid var(--cc-border)",
					display: "flex",
					alignItems: "center",
					gap: 10,
					padding: "0 20px"
				}}>
				<div
					style={{
						width: 32,
						height: 32,
						background: "var(--cc-accent)",
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0
					}}>
					<IconShieldHalf size={18} color="#151515" />
				</div>
				<Text fw={700} size="md" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
					Crisis Responders
				</Text>
			</div>

			{/* Centered card */}
			<div
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "24px 16px"
				}}>
				<div
					style={{
						width: "100%",
						maxWidth: 380,
						background: "var(--cc-panel)",
						border: "1px solid var(--cc-border)",
						borderRadius: 16,
						padding: "36px 28px"
					}}>
					<Text
						fw={700}
						size="xl"
						ta="center"
						mb={6}
						style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
						Welcome back
					</Text>
					<Text size="sm" c="dimmed" ta="center" mb={28}>
						Sign in to your account to continue
					</Text>

					<form onSubmit={handleSubmit}>
						<Stack gap={14}>
							{error && (
								<Alert
									icon={<IconAlertCircle size={16} />}
									color="red"
									variant="light"
									radius="md">
									{error}
								</Alert>
							)}

							<TextInput
								label="Email"
								placeholder="you@nairobi.go.ke"
								value={email}
								onChange={e => setEmail(e.currentTarget.value)}
								radius="md"
								required
								styles={{
									input: { background: "var(--cc-bg)", borderColor: "var(--cc-border)", color: "var(--cc-text)" },
									label: { fontWeight: 500, marginBottom: 4 }
								}}
							/>

							<PasswordInput
								label="Password"
								placeholder="••••••••"
								value={password}
								onChange={e => setPassword(e.currentTarget.value)}
								radius="md"
								required
								styles={{
									input: { background: "var(--cc-bg)", borderColor: "var(--cc-border)", color: "var(--cc-text)" },
									label: { fontWeight: 500, marginBottom: 4 }
								}}
							/>

							<Button
								type="submit"
								color="gold"
								radius="xl"
								size="md"
								fullWidth
								loading={loading}
								mt={8}>
								Sign In
							</Button>
						</Stack>
					</form>

				</div>
			</div>
		</div>
	);
}
