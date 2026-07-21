import { useRouter } from "next/router";
import { IconMap2, IconList, IconUser } from "@tabler/icons-react";

const NAV_ITEMS = [
	{ label: "Map", icon: IconMap2, href: "/map" },
	{ label: "Reports", icon: IconList, href: "/reports" },
	{ label: "Profile", icon: IconUser, href: "/profile" }
];

export default function BottomNav() {
	const router = useRouter();

	return (
		<nav
			style={{
				position: "fixed",
				bottom: 0,
				left: 0,
				right: 0,
				height: 64,
				background: "#ffffff",
				borderTop: "1px solid #e5e3db",
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
							cursor: "pointer",
							color: active ? "#1a1a1a" : "#9ca3af",
							fontFamily: "DMSans",
							fontSize: 11,
							fontWeight: active ? 600 : 400,
							transition: "color 0.15s"
						}}>
						<Icon size={22} stroke={active ? 2 : 1.5} />
						{label}
					</button>
				);
			})}
		</nav>
	);
}
