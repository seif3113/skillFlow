import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import {
	useActiveNavPath,
	type SidebarNavGroup,
} from "@/components/app-shared";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export function NavGroup({ label, items }: SidebarNavGroup) {
	const activePath = useActiveNavPath();
	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => {
					const isActive = item.path === activePath;
					const hasActiveSub = item.subItems?.some(
						(i) => i.path === activePath,
					);
					return (
						<Collapsible
							className="group/collapsible"
							defaultOpen={isActive || hasActiveSub}
							key={item.title}
							render={<SidebarMenuItem />}
						>
							{item.subItems?.length ? (
								<>
									<CollapsibleTrigger
										render={<SidebarMenuButton isActive={isActive} />}
									>
										{item.icon}
										<span>{item.title}</span>
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
										/>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.subItems?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton
														isActive={subItem.path === activePath}
														render={<Link to={subItem.path as string} />}
													>
														{subItem.icon}
														<span>{subItem.title}</span>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</>
							) : (
								<SidebarMenuButton
									isActive={isActive}
									render={<Link to={item.path as string} />}
								>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							)}
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
