import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode
} from "react";
import { useRouter } from "next/router";
import * as api from "@/lib/api";
import type { BackendResponder } from "@/lib/api";

const STORAGE_KEY = "responder_profile";

interface AuthContextType {
	responder: BackendResponder | null;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [responder, setResponder] = useState<BackendResponder | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) setResponder(JSON.parse(stored));
		setIsLoading(false);
	}, []);

	// Note: this only proves email+password matched a Responder row and finds
	// that row afterward (there's no "current session" endpoint on this
	// backend). The Django session cookie set during login is the actual
	// auth used on subsequent write calls.
	const login = useCallback(async (email: string, password: string) => {
		await api.login(email, password);
		const found = await api.findResponderByEmail(email);
		if (!found) {
			throw new Error("Login succeeded, but no matching responder record was found.");
		}
		setResponder(found);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
	}, []);

	const logout = useCallback(() => {
		api.logout().catch(() => {});
		setResponder(null);
		localStorage.removeItem(STORAGE_KEY);
		router.push("/login");
	}, [router]);

	return (
		<AuthContext.Provider value={{ responder, login, logout, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
