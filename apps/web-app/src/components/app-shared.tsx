import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DashboardSquare01Icon,
	Route01Icon,
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
			},
			{
				title: "My Roadmaps",
				path: "/roadmaps",
				icon: <HugeiconsIcon icon={Route01Icon} />,
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

// Returns the single nav path that best matches the current URL (longest
// exact-or-prefix match), so exactly one item is highlighted — e.g. on
// /roadmaps/new "Create Roadmap" wins over "My Roadmaps".
export function useActiveNavPath(): string | null {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	let best: string | null = null;
	for (const link of navLinks) {
		if (!link.path) continue;
		const matches =
			link.path === "/"
				? pathname === "/"
				: pathname === link.path || pathname.startsWith(`${link.path}/`);
		if (matches && (best === null || link.path.length > best.length)) {
			best = link.path;
		}
	}
	return best;
}
