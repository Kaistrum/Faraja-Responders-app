import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@kaistrum/stratum-ui";
import { AuthProvider } from "@/context/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
	return (
		<ThemeProvider defaultTheme="dark">
			<AuthProvider>
				<Component {...pageProps} />
			</AuthProvider>
		</ThemeProvider>
	);
}
