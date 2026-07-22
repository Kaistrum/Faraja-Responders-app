import { useState } from "react";
import { useRouter } from "next/router";
import { Card, Input, Button, Alert } from "@kaistrum/stratum-ui";
import { IconShieldHalf, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
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
		<div className="flex min-h-[100dvh] flex-col bg-bg">
			{/* Top bar */}
			<div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-border px-5">
				<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
					<IconShieldHalf size={18} className="text-text-on-accent" />
				</div>
				<span className="font-semibold text-text">Crisis Responders</span>
			</div>

			{/* Centered card */}
			<div className="flex flex-1 items-center justify-center px-4 py-6">
				<Card surface="card" padding="spacious" className="w-full max-w-[380px]">
					<h1 className="mb-1.5 text-center text-2xl font-semibold text-text">Welcome back</h1>
					<p className="mb-7 text-center text-sm text-text-dim">
						Sign in to your account to continue
					</p>

					<form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
						{error && <Alert variant="danger">{error}</Alert>}

						<Input
							label="Email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={e => setEmail(e.currentTarget.value)}
							required
						/>

						<Input
							label="Password"
							type={showPassword ? "text" : "password"}
							placeholder="••••••••"
							value={password}
							onChange={e => setPassword(e.currentTarget.value)}
							required
							trailingIcon={
								<button
									type="button"
									onClick={() => setShowPassword(s => !s)}
									className="text-text-muted transition-colors hover:text-text"
									aria-label={showPassword ? "Hide password" : "Show password"}>
									{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
								</button>
							}
						/>

						<Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
							Sign In
						</Button>
					</form>
				</Card>
			</div>
		</div>
	);
}
