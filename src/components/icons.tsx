import {
	IconActivity,
	IconBiohazard,
	IconFlame,
	IconRipple,
	IconTornado,
	IconMountain,
	IconAlertTriangle,
	IconWind,
	IconDroplets,
	IconSwords,
	IconUsersGroup,
	type IconProps
} from "@tabler/icons-react";
import type { DisasterType } from "@/types";

// Same glyph set as the dashboard app's DISASTER_ICON — each crisis is
// identified by a real icon, never by colour alone.
export const DISASTER_ICON: Record<DisasterType, React.ComponentType<IconProps>> = {
	Chemical: IconBiohazard,
	Earthquake: IconActivity,
	Fire: IconFlame,
	Flood: IconRipple,
	Hurricane: IconTornado,
	Cyclone: IconWind,
	Landslide: IconMountain,
	Tsunami: IconDroplets,
	"Civil Unrest": IconUsersGroup,
	Conflict: IconSwords,
	Other: IconAlertTriangle
};

export function DisasterGlyph({
	type,
	size = 16,
	color,
	stroke = 2
}: {
	type: DisasterType;
	size?: number;
	color?: string;
	stroke?: number;
}) {
	const Comp = DISASTER_ICON[type] ?? IconAlertTriangle;
	return <Comp size={size} color={color} stroke={stroke} />;
}
