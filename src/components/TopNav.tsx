import { useRouter } from "next/router";
import { IconMap2, IconList, IconUser, IconRoute } from "@tabler/icons-react";

const NAV_ITEMS = [
	{ label: "Map", icon: IconMap2, href: "/map" },
	{ label: "Reports", icon: IconList, href: "/reports" },
	{ label: "Route", icon: IconRoute, href: "/route" },
	{ label: "Profile", icon: IconUser, href: "/profile" }
];

export default function TopNav() {
	const router = useRouter();

	return (
		<nav
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				height: 64,
				background: "var(--cc-panel)",
				borderBottom: "1px solid var(--cc-border)",
				display: "flex",
				alignItems: "stretch",
				zIndex: 1000
			}}>
			{NAV_ITEMS.map(({ label, icon: Icon, href }) => {
				const active = router.pathname === href;
				return (
					<button
						key={href}
						onClick={() => router.push(href)}
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: 4,
							background: "none",
							border: "none",
							borderBottom: active ? "2.5px solid var(--cc-accent)" : "2.5px solid transparent",
							cursor: "pointer",
							color: active ? "var(--cc-accent)" : "var(--cc-text-muted)",
							fontFamily: "'Public Sans', sans-serif",
							fontSize: 11,
							fontWeight: active ? 600 : 400,
							transition: "color 0.15s, border-color 0.15s"
						}}>
						<Icon size={22} stroke={active ? 2 : 1.5} />
						{label}
					</button>
				);
			})}
		</nav>
	);
}
