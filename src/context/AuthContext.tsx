import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode
} from "react";
import { useRouter } from "next/router";
import { mockResponder, MOCK_CREDENTIALS } from "@/data/mockData";
import { Responder } from "@/types";

interface AuthContextType {
	responder: Responder | null;
	login: (email: string, password: string) => boolean;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [responder, setResponder] = useState<Responder | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const stored = localStorage.getItem("responder_auth");
		if (stored) setResponder(JSON.parse(stored));
		setIsLoading(false);
	}, []);

	const login = (email: string, password: string): boolean => {
		if (
			email === MOCK_CREDENTIALS.email &&
			password === MOCK_CREDENTIALS.password
		) {
			setResponder(mockResponder);
			localStorage.setItem("responder_auth", JSON.stringify(mockResponder));
			return true;
		}
		return false;
	};

	const logout = () => {
		setResponder(null);
		localStorage.removeItem("responder_auth");
		router.push("/login");
	};

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
