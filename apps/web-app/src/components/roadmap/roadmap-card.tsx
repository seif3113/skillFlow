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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type RoadmapListItem = MyRoadmapsQuery["roadmaps"][number]

export function RoadmapCard({
  roadmap,
  onDelete,
}: {
  roadmap: RoadmapListItem
  // Optional: when omitted (e.g. on the dashboard) the card is view-only.
  onDelete?: (roadmap: RoadmapListItem) => void
}) {
  const nodes = roadmap.nodes ?? []
  const total = nodes.length
  const completed = nodes.filter((n) => n.isCompleted).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Card className="relative gap-4 transition-colors hover:ring-primary">
      <CardHeader className="items-center">
        <CardTitle className="truncate font-medium">{roadmap.title}</CardTitle>
        <CardAction className="flex items-center gap-1">
          {roadmap.isPublished ? (
            <Badge variant="secondary">Public</Badge>
          ) : null}
          {onDelete ? (
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
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <Progress value={pct} />
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>
            {completed} / {total} topics
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      </CardContent>

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
