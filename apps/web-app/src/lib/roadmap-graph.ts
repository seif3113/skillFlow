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
  description?: string
}

// The API stores tags/resources as opaque JSON; narrow them defensively.
export function asTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((t): t is string => typeof t === "string")
    : []
}

export function asResources(value: unknown): RoadmapResource[] {
  if (!Array.isArray(value)) return []
  return value.filter((r): r is RoadmapResource => !!r && typeof r === "object")
}

// A node is "completed" (quiz passed), "locked" (some prerequisite isn't
// completed yet), or "available" (reachable now).
export type NodeStatus = "completed" | "available" | "locked"

export type RoadmapFlowNode = Node<
  { node: RoadmapNode; status: NodeStatus },
  "roadmap"
>
export type RoadmapFlowEdge = Edge

// Derive each node's status from completion + prerequisite edges.
export function nodeStatusMap(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[]
): Map<number, NodeStatus> {
  const completed = new Set(nodes.filter((n) => n.isCompleted).map((n) => n.id))
  const prereqs = new Map<number, number[]>()
  for (const e of edges) {
    const list = prereqs.get(e.targetNodeId) ?? []
    list.push(e.sourceNodeId)
    prereqs.set(e.targetNodeId, list)
  }
  const map = new Map<number, NodeStatus>()
  for (const n of nodes) {
    if (n.isCompleted) {
      map.set(n.id, "completed")
    } else {
      const locked = (prereqs.get(n.id) ?? []).some((id) => !completed.has(id))
      map.set(n.id, locked ? "locked" : "available")
    }
  }
  return map
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 96

// Lays the prerequisite DAG top-to-bottom with dagre, returning xyflow nodes
// (top-left positions) + smoothstep edges. Runs on every render since we don't
// persist positions, so generated/adapted graphs always stay readable.
export function layoutRoadmap(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[]
): { nodes: RoadmapFlowNode[]; edges: RoadmapFlowEdge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 72 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(String(node.id), { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  const nodeIds = new Set(nodes.map((n) => n.id))
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)
  )
  for (const edge of validEdges) {
    g.setEdge(String(edge.sourceNodeId), String(edge.targetNodeId))
  }

  dagre.layout(g)

  const statuses = nodeStatusMap(nodes, edges)
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
      data: { node, status: statuses.get(node.id) ?? "available" },
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
