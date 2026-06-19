import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DashboardSquare01Icon,
	Route01Icon,
	MagicWand01Icon,
	Compass01Icon,
	Quiz01Icon,
	ChartLineData01Icon,
	Settings01Icon,
	HelpCircleIcon,
} from "@hugeicons/core-free-icons";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Learn",
		items: [
			{
				title: "Dashboard",
				path: "/",
				icon: <HugeiconsIcon icon={DashboardSquare01Icon} />,
				isActive: true,
			},
			{
				title: "My Roadmaps",
				path: "/roadmaps",
				icon: <HugeiconsIcon icon={Route01Icon} />,
			},
			{
				title: "Create Roadmap",
				path: "/roadmaps/new",
				icon: <HugeiconsIcon icon={MagicWand01Icon} />,
			},
			{
				title: "Explore",
				path: "/explore",
				icon: <HugeiconsIcon icon={Compass01Icon} />,
			},
		],
	},
	{
		label: "Practice",
		items: [
			{
				title: "Quizzes",
				path: "/quizzes",
				icon: <HugeiconsIcon icon={Quiz01Icon} />,
			},
			{
				title: "Progress",
				path: "/progress",
				icon: <HugeiconsIcon icon={ChartLineData01Icon} />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Settings",
		path: "/settings",
		icon: <HugeiconsIcon icon={Settings01Icon} />,
	},
	{
		title: "Help Center",
		path: "/help",
		icon: <HugeiconsIcon icon={HelpCircleIcon} />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
