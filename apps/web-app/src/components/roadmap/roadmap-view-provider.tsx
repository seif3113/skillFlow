import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnReconnect,
} from "@xyflow/react"
import { toast } from "sonner"

import {
  GetRoadmapDocument,
  CreateNodeEdgeDocument,
  DeleteNodeEdgeDocument,
  DeleteNodeDocument,
  PublishRoadmapDocument,
} from "@/gql/graphql"
import {
  layoutRoadmap,
  upsertById,
  type RoadmapNode,
  type RoadmapEdge,
  type RoadmapFlowNode,
  type RoadmapFlowEdge,
} from "@/lib/roadmap-graph"
import { useRoadmapGenerationStream } from "@/hooks/use-roadmap-generation"
import {
  RoadmapViewContext,
  type FitViewInstance,
  type RoadmapViewContextValue,
} from "./roadmap-view-context"

// Owns ALL roadmap-view state: the query+poll, live generation stream, the
// dagre-derived xyflow state, and the editing mutations. The compound UI parts
// only consume the context interface, never this implementation.
export function RoadmapViewProvider({
  roadmapId,
  generating,
  onGenerationSettled,
  children,
}: {
  roadmapId: number
  generating: boolean
  onGenerationSettled: () => void
  children: React.ReactNode
}) {
  // While generating, poll the persisted roadmap as a progressive-reveal safety
  // net alongside the live subscription.
  const { data, loading, refetch } = useQuery(GetRoadmapDocument, {
    variables: { id: roadmapId },
    pollInterval: generating ? 1000 : 0,
  })

  // Domain graph — source of truth; the xyflow flow state is derived from it.
  const [rmNodes, setRmNodes] = useState<RoadmapNode[]>([])
  const [rmEdges, setRmEdges] = useState<RoadmapEdge[]>([])
  const stableRef = useRef({ count: -1, ticks: 0 })

  useEffect(() => {
    if (!data?.roadmap) return
    const nodes = data.roadmap.nodes ?? []
    const edges = data.roadmap.edges ?? []
    setRmNodes(nodes)
    setRmEdges(edges)
    // Fallback completion: if the live `done` event is missed, settle once the
    // persisted node count holds steady across a few polls.
    if (generating) {
      if (nodes.length === stableRef.current.count) stableRef.current.ticks += 1
      else stableRef.current = { count: nodes.length, ticks: 0 }
      if (nodes.length > 0 && stableRef.current.ticks >= 4)
        onGenerationSettled()
    }
  }, [data, generating, onGenerationSettled])

  // xyflow-owned state so nodes are draggable; positions live here, not in the
  // domain. Re-run the dagre layout only when the graph *structure* changes.
  const [flowNodes, setFlowNodes, onNodesChange] =
    useNodesState<RoadmapFlowNode>([])
  const [flowEdges, setFlowEdges, onEdgesChange] =
    useEdgesState<RoadmapFlowEdge>([])

  const instanceRef = useRef<FitViewInstance | null>(null)
  const lastStructureRef = useRef<string>("")

  const structureKey = useMemo(
    () =>
      rmNodes
        .map((n) => n.id)
        .sort((a, b) => a - b)
        .join(",") +
      "|" +
      rmEdges
        .map((e) => e.id)
        .sort((a, b) => a - b)
        .join(","),
    [rmNodes, rmEdges]
  )

  useEffect(() => {
    if (structureKey !== lastStructureRef.current) {
      lastStructureRef.current = structureKey
      const laid = layoutRoadmap(rmNodes, rmEdges)
      setFlowNodes(laid.nodes)
      setFlowEdges(laid.edges)
      requestAnimationFrame(() =>
        instanceRef.current?.fitView({ duration: 200, padding: 0.2 })
      )
    } else {
      setFlowNodes((prev) =>
        prev.map((fn) => {
          const dn = rmNodes.find((n) => String(n.id) === fn.id)
          return dn ? { ...fn, data: { node: dn } } : fn
        })
      )
    }
  }, [structureKey, rmNodes, rmEdges, setFlowNodes, setFlowEdges])

  const { status } = useRoadmapGenerationStream({
    roadmapId,
    enabled: generating,
    callbacks: {
      onNode: (node) => setRmNodes((prev) => upsertById(prev, node)),
      onEdges: (incoming) =>
        setRmEdges((prev) =>
          incoming.reduce((acc, e) => upsertById(acc, e), prev)
        ),
      onDone: () => {
        void refetch()
        onGenerationSettled()
      },
      onError: (message) => toast.error(message),
    },
  })

  // --- editing mutations ---
  const [createNodeEdge] = useMutation(CreateNodeEdgeDocument)
  const [deleteNodeEdge] = useMutation(DeleteNodeEdgeDocument)
  const [deleteNode] = useMutation(DeleteNodeDocument)
  const [publishRoadmap] = useMutation(PublishRoadmapDocument)

  // Toggle public visibility. The mutation returns { id, isPublished } so
  // Apollo updates the normalized roadmap and the header reflects it.
  const togglePublish = useCallback(() => {
    publishRoadmap({ variables: { id: roadmapId } }).catch(() =>
      toast.error("Couldn't update visibility.")
    )
  }, [publishRoadmap, roadmapId])

  // Completion is gated behind passing the node's quiz (server-side). The quiz
  // panel calls this after a passing attempt to reflect it on the canvas.
  const markCompleted = useCallback((nodeId: number) => {
    setRmNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isCompleted: true } : n))
    )
  }, [])

  // The node editor calls this after a successful UpdateNode so the canvas
  // reflects new title/description/tags/resources without a refetch.
  const updateNode = useCallback((updated: RoadmapNode) => {
    setRmNodes((prev) =>
      prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
    )
  }, [])

  const connect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return
      createNodeEdge({
        variables: {
          roadmapId,
          sourceNodeId: Number(conn.source),
          targetNodeId: Number(conn.target),
        },
      })
        .then((res) => {
          const edge = res.data?.createNodeEdge
          if (edge) setRmEdges((prev) => upsertById(prev, edge))
        })
        .catch(() => toast.error("Couldn't connect these topics."))
    },
    [createNodeEdge, roadmapId]
  )

  const reconnect: OnReconnect = useCallback(
    (oldEdge, newConn) => {
      if (!newConn.source || !newConn.target) return
      Promise.all([
        deleteNodeEdge({ variables: { id: Number(oldEdge.id) } }),
        createNodeEdge({
          variables: {
            roadmapId,
            sourceNodeId: Number(newConn.source),
            targetNodeId: Number(newConn.target),
          },
        }),
      ])
        .then(([, created]) => {
          const edge = created.data?.createNodeEdge
          setRmEdges((prev) => {
            const withoutOld = prev.filter((x) => String(x.id) !== oldEdge.id)
            return edge ? [...withoutOld, edge] : withoutOld
          })
        })
        .catch(() => toast.error("Couldn't reconnect."))
    },
    [createNodeEdge, deleteNodeEdge, roadmapId]
  )

  const deleteEdges = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((e) => e.id))
      setRmEdges((prev) => prev.filter((e) => !ids.has(String(e.id))))
      for (const e of deleted) {
        deleteNodeEdge({ variables: { id: Number(e.id) } }).catch(() =>
          toast.error("Couldn't delete an edge.")
        )
      }
    },
    [deleteNodeEdge]
  )

  const deleteNodes = useCallback(
    (deleted: { id: string }[]) => {
      const ids = new Set(deleted.map((n) => n.id))
      setRmNodes((prev) => prev.filter((n) => !ids.has(String(n.id))))
      setRmEdges((prev) =>
        prev.filter(
          (e) =>
            !ids.has(String(e.sourceNodeId)) && !ids.has(String(e.targetNodeId))
        )
      )
      for (const n of deleted) {
        deleteNode({ variables: { id: Number(n.id) } }).catch(() =>
          toast.error("Couldn't delete a node.")
        )
      }
    },
    [deleteNode]
  )

  // Pull server truth again — the AI assistant mutates the roadmap server-side,
  // so after its turn we refetch and the data effect re-syncs the canvas.
  const refetchRoadmap = useCallback(() => {
    void refetch()
  }, [refetch])

  const registerInstance = useCallback((instance: FitViewInstance) => {
    instanceRef.current = instance
  }, [])

  // Pan/zoom the canvas to center a single node (on click).
  const focusNode = useCallback((id: number) => {
    instanceRef.current?.fitView({
      nodes: [{ id: String(id) }],
      duration: 400,
      maxZoom: 1.3,
      padding: 0.6,
    })
  }, [])

  const value: RoadmapViewContextValue = useMemo(
    () => ({
      state: {
        title: data?.roadmap?.title ?? "Roadmap",
        status,
        isStreaming: status === "streaming",
        isLoading: loading && !data,
        isPublished: data?.roadmap?.isPublished ?? false,
        nodeCount: rmNodes.length,
        flowNodes,
        flowEdges,
      },
      actions: {
        onNodesChange,
        onEdgesChange,
        connect,
        reconnect,
        deleteEdges,
        deleteNodes,
        focusNode,
        markCompleted,
        updateNode,
        togglePublish,
        refetchRoadmap,
      },
      meta: { roadmapId, registerInstance },
    }),
    [
      data,
      loading,
      status,
      rmNodes.length,
      flowNodes,
      flowEdges,
      onNodesChange,
      onEdgesChange,
      connect,
      reconnect,
      deleteEdges,
      deleteNodes,
      focusNode,
      markCompleted,
      updateNode,
      togglePublish,
      refetchRoadmap,
      roadmapId,
      registerInstance,
    ]
  )

  return <RoadmapViewContext value={value}>{children}</RoadmapViewContext>
}
