import { useCallback } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { RoadmapView } from "@/components/roadmap/roadmap-view"

export const Route = createFileRoute("/_authed/roadmaps/$id")({
  // `topic` present ⇒ a generation was just kicked off; the view subscribes +
  // polls until it settles, then clears the param.
  validateSearch: (
    search: Record<string, unknown>,
  ): { topic?: string } => ({
    topic: typeof search.topic === "string" ? search.topic : undefined,
  }),
  component: RoadmapViewPage,
})

function RoadmapViewPage() {
  const { id } = Route.useParams()
  const { topic } = Route.useSearch()
  const navigate = useNavigate()

  const handleGenerationSettled = useCallback(() => {
    void navigate({
      to: "/roadmaps/$id",
      params: { id },
      search: {},
      replace: true,
    })
  }, [navigate, id])

  return (
    <RoadmapView.Provider
      roadmapId={Number(id)}
      generating={!!topic}
      onGenerationSettled={handleGenerationSettled}
    >
      <div className="flex flex-col gap-4">
        <RoadmapView.Header />
        <RoadmapView.Canvas />
        <RoadmapView.Hint />
      </div>
      {/* Portals to body; lives inside the provider so it reads view state. */}
      <RoadmapView.NodeDetail />
    </RoadmapView.Provider>
  )
}
