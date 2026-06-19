import { useCallback, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiChat02Icon } from "@hugeicons/core-free-icons"

import { RoadmapView } from "@/components/roadmap/roadmap-view"
import { Button } from "@/components/ui/button"

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
  const [assistantOpen, setAssistantOpen] = useState(false)

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
          <div className="flex gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <RoadmapView.Canvas />
              <RoadmapView.Hint />
            </div>
            {assistantOpen ? (
              <RoadmapView.Assistant onClose={() => setAssistantOpen(false)} />
            ) : null}
          </div>
        </div>

        {assistantOpen ? null : (
          <Button
            className="fixed right-6 bottom-6 z-40 shadow-lg"
            onClick={() => setAssistantOpen(true)}
          >
            <HugeiconsIcon icon={AiChat02Icon} data-icon="inline-start" />
            Ask AI
          </Button>
        )}
      </RoadmapView.Provider>
      {/* Mounted OUTSIDE the provider so the canvas's re-renders never touch
          the sheet; it's linked to node clicks via the external store. */}
      <RoadmapView.Sheet />
    </RoadmapView.SheetProvider>
  )
}
