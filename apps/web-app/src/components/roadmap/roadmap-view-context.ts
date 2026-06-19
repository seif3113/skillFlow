import { createContext, use } from "react"
import type {
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  OnReconnect,
} from "@xyflow/react"
import type { GenerationStatus } from "@/hooks/use-roadmap-generation"
import type {
  RoadmapNode,
  RoadmapFlowNode,
  RoadmapFlowEdge,
} from "@/lib/roadmap-graph"

// Minimal structural view of the xyflow instance we actually use.
export type FitViewInstance = {
  fitView: (opts?: {
    duration?: number
    padding?: number
    maxZoom?: number
    nodes?: { id: string }[]
  }) => void
}

// Generic contract for the roadmap view. Any provider that implements this
// (live-streaming editor today, a read-only public viewer later, a test double)
// can drive the same compound UI parts below.
export interface RoadmapViewState {
  title: string
  status: GenerationStatus
  isStreaming: boolean
  isLoading: boolean
  isPublished: boolean
  nodeCount: number
  flowNodes: RoadmapFlowNode[]
  flowEdges: RoadmapFlowEdge[]
}

export interface RoadmapViewActions {
  onNodesChange: (changes: NodeChange<RoadmapFlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<RoadmapFlowEdge>[]) => void
  connect: (conn: Connection) => void
  reconnect: OnReconnect
  deleteEdges: (edges: Edge[]) => void
  deleteNodes: (nodes: { id: string }[]) => void
  focusNode: (id: number) => void
  // Reflect a node's completion locally after a passing quiz attempt.
  markCompleted: (nodeId: number) => void
  // Reflect an edited node (title/description/tags/resources) on the canvas.
  updateNode: (node: RoadmapNode) => void
  // Toggle whether the roadmap is published to the public Explore directory.
  togglePublish: () => void
  // Re-pull the roadmap from the server (e.g. after the AI assistant edits it).
  refetchRoadmap: () => void
}

export interface RoadmapViewMeta {
  roadmapId: number
  registerInstance: (instance: FitViewInstance) => void
}

export interface RoadmapViewContextValue {
  state: RoadmapViewState
  actions: RoadmapViewActions
  meta: RoadmapViewMeta
}

export const RoadmapViewContext = createContext<RoadmapViewContextValue | null>(
  null
)

export function useRoadmapView(): RoadmapViewContextValue {
  const ctx = use(RoadmapViewContext)
  if (!ctx) {
    throw new Error("useRoadmapView must be used within <RoadmapView.Provider>")
  }
  return ctx
}
