import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "@/context/AuthContext";

const theme = createTheme({
	fontFamily: "'Public Sans', sans-serif",
	headings: { fontFamily: "'Big Shoulders Display', sans-serif" },
	primaryColor: "gold",
	autoContrast: true,
	colors: {
		gold: [
			"#fff8dd",
			"#ffefb0",
			"#ffe680",
			"#ffdd50",
			"#fed42a",
			"#fece09",
			"#f0c200",
			"#d5ac00",
			"#bd9600",
			"#a37f00"
		]
	}
});

export default function App({ Component, pageProps }: AppProps) {
	return (
		<MantineProvider theme={theme} defaultColorScheme="dark">
			<Notifications position="top-right" />
			<AuthProvider>
				<Component {...pageProps} />
			</AuthProvider>
		</MantineProvider>
	);
}
