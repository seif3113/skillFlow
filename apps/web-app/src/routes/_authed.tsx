import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AppShell } from "@/components/app-shell"

// Pathless layout guarding everything beneath it: unauthenticated visitors are
// sent to /login. `context.user` is populated by the root route's beforeLoad.
// The app shell (sidebar + header) mounts here once and persists across authed
// navigations — child routes render into its content area via <Outlet/>.
export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
