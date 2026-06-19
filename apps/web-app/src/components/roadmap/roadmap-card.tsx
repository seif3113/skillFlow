import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"

import type { MyRoadmapsQuery } from "@/gql/graphql"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type RoadmapListItem = MyRoadmapsQuery["roadmaps"][number]

export function RoadmapCard({
  roadmap,
  onDelete,
}: {
  roadmap: RoadmapListItem
  onDelete: (roadmap: RoadmapListItem) => void
}) {
  const nodes = roadmap.nodes ?? []
  const total = nodes.length
  const completed = nodes.filter((n) => n.isCompleted).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Card className="relative transition-colors hover:border-primary/40">
      <CardHeader>
        <CardTitle className="truncate">{roadmap.title}</CardTitle>
        {roadmap.isPublished ? (
          <Badge variant="secondary">Published</Badge>
        ) : null}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete roadmap"
            className="relative z-10 text-muted-foreground"
            onClick={(e) => {
              // Sits above the stretched link below; don't navigate.
              e.preventDefault()
              e.stopPropagation()
              onDelete(roadmap)
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {roadmap.description ? (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {roadmap.description}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Progress value={pct} />
          <p className="text-muted-foreground text-xs">
            {completed} / {total} topics{total > 0 ? ` · ${pct}%` : ""}
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Updated {new Date(roadmap.updatedAt).toLocaleDateString()}
        </p>
      </CardFooter>

      {/* Stretched link makes the whole card open the roadmap; the delete
          button above (z-10) stays clickable. */}
      <Link
        to="/roadmaps/$id"
        params={{ id: String(roadmap.id) }}
        aria-label={`Open ${roadmap.title}`}
        className="absolute inset-0 rounded-[inherit]"
      />
    </Card>
  )
}
