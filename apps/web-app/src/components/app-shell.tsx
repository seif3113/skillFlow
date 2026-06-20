import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { PageContainer } from "@/components/page-container";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				{/* Every page shares one centered container + padding. */}
				<div className="flex flex-1 flex-col p-4 md:p-6">
					<PageContainer>{children}</PageContainer>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
