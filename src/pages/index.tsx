import { useEffect } from "react";
import { useRouter } from "next/router";
import { Loader } from "@mantine/core";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		router.replace(responder ? "/map" : "/login");
	}, [responder, isLoading, router]);

	return (
		<div
			style={{
				height: "100dvh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#f0eee6"
			}}>
			<Loader color="dark" />
		</div>
	);
}
