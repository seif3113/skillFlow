import { createFileRoute, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import {
  PublicRoadmapView,
  ForkButton,
} from "@/components/roadmap/public-roadmap-view"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_authed/explore/$id")({
  component: PublicRoadmapPage,
})

function PublicRoadmapPage() {
  const { id } = Route.useParams()

  return (
    <PublicRoadmapView
      roadmapId={Number(id)}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link to="/explore" />}>
            <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
            Explore
          </Button>
          <ForkButton roadmapId={Number(id)} />
        </div>
      }
    />
  )
}
