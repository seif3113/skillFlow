import dagre from "@dagrejs/dagre"
import { MarkerType, type Edge, type Node } from "@xyflow/react"
import type {
  RoadmapNodeFieldsFragment,
  RoadmapEdgeFieldsFragment,
} from "@/gql/graphql"

export type RoadmapNode = RoadmapNodeFieldsFragment
export type RoadmapEdge = RoadmapEdgeFieldsFragment

export type RoadmapResource = {
  title?: string
  url?: string
  source?: string
  type?: string
}

// The API stores tags/resources as opaque JSON; narrow them defensively.
export function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : []
}

export function asResources(value: unknown): RoadmapResource[] {
  if (!Array.isArray(value)) return []
  return value.filter((r): r is RoadmapResource => !!r && typeof r === "object")
}

export type RoadmapFlowNode = Node<{ node: RoadmapNode }, "roadmap">
export type RoadmapFlowEdge = Edge

const NODE_WIDTH = 260
const NODE_HEIGHT = 96

// Lays the prerequisite DAG top-to-bottom with dagre, returning xyflow nodes
// (top-left positions) + smoothstep edges. Runs on every render since we don't
// persist positions, so generated/adapted graphs always stay readable.
export function layoutRoadmap(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
): { nodes: RoadmapFlowNode[]; edges: RoadmapFlowEdge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 72 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(String(node.id), { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  const nodeIds = new Set(nodes.map((n) => n.id))
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId),
  )
  for (const edge of validEdges) {
    g.setEdge(String(edge.sourceNodeId), String(edge.targetNodeId))
  }

  dagre.layout(g)

  const flowNodes: RoadmapFlowNode[] = nodes.map((node) => {
    const pos = g.node(String(node.id))
    return {
      id: String(node.id),
      type: "roadmap",
      // dagre gives the center; xyflow expects the top-left corner.
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: { node },
    }
  })

  const flowEdges: RoadmapFlowEdge[] = validEdges.map((edge) => ({
    id: String(edge.id),
    source: String(edge.sourceNodeId),
    target: String(edge.targetNodeId),
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  }))

  return { nodes: flowNodes, edges: flowEdges }
}

// Merge helper: upsert a node by id (used while streaming).
export function upsertById<T extends { id: number }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return [...list, item]
  const next = list.slice()
  next[idx] = item
  return next
}
