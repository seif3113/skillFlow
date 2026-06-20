import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@apollo/client/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Compass01Icon, ViewIcon } from "@hugeicons/core-free-icons"

import { PublicRoadmapsDocument } from "@/gql/graphql"
import { ForkButton } from "@/components/roadmap/public-roadmap-view"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export const Route = createFileRoute("/_authed/explore/")({
  component: ExplorePage,
})

function ExplorePage() {
  const { data, loading } = useQuery(PublicRoadmapsDocument)
  const roadmaps = data?.publicRoadmaps ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Public roadmaps shared by the community. Fork one to make it your own.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : roadmaps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Compass01Icon} />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              No public roadmaps have been shared yet. Publish one of yours to
              get things started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    {roadmap.userImage ? (
                      <AvatarImage
                        src={roadmap.userImage}
                        alt={roadmap.userName}
                      />
                    ) : null}
                    <AvatarFallback>
                      {roadmap.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{roadmap.title}</CardTitle>
                    <CardDescription>by {roadmap.userName}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {roadmap.description ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {roadmap.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {roadmap.nodes?.length ?? 0} topic
                  {(roadmap.nodes?.length ?? 0) === 1 ? "" : "s"}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  render={
                    <Link
                      to="/explore/$id"
                      params={{ id: String(roadmap.id) }}
                    />
                  }
                >
                  <HugeiconsIcon icon={ViewIcon} data-icon="inline-start" />
                  View
                </Button>
                <ForkButton roadmapId={roadmap.id} className="flex-1" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
