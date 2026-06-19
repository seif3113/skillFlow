import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/app-shell"

export const Route = createFileRoute("/_authed/")({
  component: Home,
})

function Home() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">SkillFlow</h1>
      <p className="text-muted-foreground">
        Signed in as {user?.name ?? user?.email}
      </p>
    </AppShell>
  )
}
