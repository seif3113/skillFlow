import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

// Pathless layout guarding everything beneath it: unauthenticated visitors are
// sent to /login. `context.user` is populated by the root route's beforeLoad.
export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" })
    }
  },
  component: () => <Outlet />,
})
