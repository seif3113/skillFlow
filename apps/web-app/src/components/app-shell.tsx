import { useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { PageContainer } from "@/components/page-container";

// The roadmap viewers (/roadmaps/:id and /explore/:id) use the full width for
// the canvas; every other page gets its content centered in a PageContainer.
const FULL_WIDTH = /^\/(roadmaps|explore)\/[^/]+$/;

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const fullWidth = FULL_WIDTH.test(pathname);
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<div className="flex flex-1 flex-col p-4 md:p-6">
					{fullWidth ? children : <PageContainer>{children}</PageContainer>}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
