import { useEffect, useRef, useState } from "react"
import { useMutation, useSubscription } from "@apollo/client/react"
import {
  GenerateRoadmapStreamDocument,
  RoadmapGenerationStreamDocument,
} from "@/gql/graphql"
import type { RoadmapNode, RoadmapEdge } from "@/lib/roadmap-graph"

export type GenerationStatus = "idle" | "streaming" | "done" | "error"

type Callbacks = {
  onNode: (node: RoadmapNode) => void
  onEdges: (edges: RoadmapEdge[]) => void
  onDone: () => void
}

// Drives live roadmap generation: subscribes to the server's generation stream
// and (once) fires the kickoff mutation. Nodes/edges are persisted server-side
// as they stream, so `onDone` should reconcile via a refetch to recover any
// events missed before the socket was ready.
export function useRoadmapGeneration(opts: {
  roadmapId: number
  topic?: string
  answers?: string[]
  enabled: boolean
  callbacks: Callbacks
}) {
  const { roadmapId, topic, answers, enabled, callbacks } = opts
  const [status, setStatus] = useState<GenerationStatus>(
    enabled ? "streaming" : "idle",
  )
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  // Keep callbacks fresh without resubscribing.
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks

  const [generate] = useMutation(GenerateRoadmapStreamDocument)

  useSubscription(RoadmapGenerationStreamDocument, {
    variables: { roadmapId },
    skip: !enabled,
    onData: ({ data }) => {
      const ev = data.data?.roadmapGenerationStream
      if (!ev) return
      if (ev.event === "node") {
        if (ev.node) cbRef.current.onNode(ev.node)
        if (ev.edges?.length) cbRef.current.onEdges(ev.edges)
        setStatus("streaming")
      } else if (ev.event === "done") {
        setStatus("done")
        cbRef.current.onDone()
      } else if (ev.event === "error") {
        setStatus("error")
        setError(ev.message ?? "Generation failed")
      }
    },
  })

  useEffect(() => {
    if (!enabled || firedRef.current || !topic) return
    firedRef.current = true
    // Small delay so the WS subscription is established before the server
    // starts emitting; onDone's refetch covers anything still missed.
    const t = setTimeout(() => {
      generate({
        variables: { roadmapId, topic, customizationAnswers: answers ?? [] },
      }).catch((e: unknown) => {
        setStatus("error")
        setError(e instanceof Error ? e.message : "Failed to start generation")
      })
    }, 250)
    return () => clearTimeout(t)
  }, [enabled, topic, answers, roadmapId, generate])

  return { status, error }
}
