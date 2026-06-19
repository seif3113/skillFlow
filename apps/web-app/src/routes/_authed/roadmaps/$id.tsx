import { useCallback } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { RoadmapView } from "@/components/roadmap/roadmap-view"

export const Route = createFileRoute("/_authed/roadmaps/$id")({
  // `topic` present ⇒ a generation was just kicked off; the view subscribes +
  // polls until it settles, then clears the param.
  validateSearch: (search: Record<string, unknown>): { topic?: string } => ({
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
    <RoadmapView.SheetProvider>
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
      </RoadmapView.Provider>
      {/* Mounted OUTSIDE the provider so the canvas's re-renders never touch
          the sheet; it's linked to node clicks via the external store. */}
      <RoadmapView.Sheet />
    </RoadmapView.SheetProvider>
  )
}
