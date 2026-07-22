import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner } from "@kaistrum/stratum-ui";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
	const { responder, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		router.replace(responder ? "/map" : "/login");
	}, [responder, isLoading, router]);

	return (
		<div className="flex h-[100dvh] items-center justify-center bg-bg">
			<Spinner size={28} />
		</div>
	);
}
