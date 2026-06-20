import { useState } from "react"
import { useSubscription } from "@apollo/client/react"
import { RoadmapGenerationStreamDocument } from "@/gql/graphql"
import type { RoadmapNode, RoadmapEdge } from "@/lib/roadmap-graph"

export type GenerationStatus = "idle" | "streaming" | "done" | "error"

type Callbacks = {
  onNode: (node: RoadmapNode) => void
  onEdges: (edges: RoadmapEdge[]) => void
  onDone: () => void
  onError?: (message: string) => void
}

// Subscribes to a roadmap's live generation stream and reports status. The
// kickoff mutation is fired explicitly from the create flow (a user action),
// NOT here, so this hook is purely declarative. Apollo reads `onData` from its
// own latest-options ref each event, so the inline callbacks below are always
// current — no `useEffect`, no fire-once ref, nothing for re-renders to clobber.
export function useRoadmapGenerationStream(opts: {
  roadmapId: number
  enabled: boolean
  callbacks: Callbacks
}) {
  const { roadmapId, enabled, callbacks } = opts
  const [status, setStatus] = useState<GenerationStatus>(
    enabled ? "streaming" : "idle",
  )
  const [error, setError] = useState<string | null>(null)

  useSubscription(RoadmapGenerationStreamDocument, {
    variables: { roadmapId },
    skip: !enabled,
    onData: ({ data }) => {
      const ev = data.data?.roadmapGenerationStream
      if (!ev) return
      if (ev.event === "node") {
        if (ev.node) callbacks.onNode(ev.node)
        if (ev.edges?.length) callbacks.onEdges(ev.edges)
        setStatus("streaming")
      } else if (ev.event === "done") {
        setStatus("done")
        callbacks.onDone()
      } else if (ev.event === "error") {
        const message = ev.message ?? "Generation failed"
        setStatus("error")
        setError(message)
        callbacks.onError?.(message)
      }
    },
  })

  return { status, error }
}
