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
		<nav className="fixed inset-x-0 top-0 z-[1000] flex h-16 items-stretch border-b border-border bg-nav-bg backdrop-blur">
			{NAV_ITEMS.map(({ label, icon: Icon, href }) => {
				const active = router.pathname === href;
				return (
					<button
						key={href}
						onClick={() => router.push(href)}
						className={`flex flex-1 flex-col items-center justify-center gap-1 border-b-2 text-[11px] font-medium transition-colors duration-200 ${
							active
								? "border-accent text-accent"
								: "border-transparent text-text-muted hover:text-text"
						}`}>
						<Icon size={22} stroke={active ? 2 : 1.5} />
						{label}
					</button>
				);
			})}
		</nav>
	);
}
