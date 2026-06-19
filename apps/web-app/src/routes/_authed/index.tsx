import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@apollo/client/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Route01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { MyRoadmapsDocument } from "@/gql/graphql"
import { RoadmapCard } from "@/components/roadmap/roadmap-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export const Route = createFileRoute("/_authed/")({
  component: Home,
})

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function Home() {
  const { user } = Route.useRouteContext()
  const { data, loading } = useQuery(MyRoadmapsDocument)

  const firstName = user?.name?.split(" ")[0] ?? "there"
  const roadmaps = data?.roadmaps ?? []

  const allNodes = roadmaps.flatMap((r) => r.nodes ?? [])
  const completedTopics = allNodes.filter((n) => n.isCompleted).length
  const inProgress = roadmaps.filter((r) => {
    const ns = r.nodes ?? []
    return ns.length > 0 && ns.filter((n) => n.isCompleted).length < ns.length
  }).length

  // Most recently touched roadmaps for "continue learning".
  const recent = [...roadmaps]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-semibold text-2xl">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground text-sm">
          Pick up where you left off or start something new.
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : roadmaps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Route01Icon} />
            </EmptyMedia>
            <EmptyTitle>Start your first roadmap</EmptyTitle>
            <EmptyDescription>
              Generate a personalized, AI-built learning path for any topic.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/roadmaps/new" />} nativeButton={false}>
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Create a roadmap
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Roadmaps" value={roadmaps.length} />
            <StatCard label="In progress" value={inProgress} />
            <StatCard label="Topics completed" value={completedTopics} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-lg">Continue learning</h2>
              <Link
                to="/roadmaps"
                className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              >
                View all
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
