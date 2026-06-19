import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type OnReconnect,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons"

import {
  GetRoadmapDocument,
  UpdateNodeDocument,
  CreateNodeEdgeDocument,
  DeleteNodeEdgeDocument,
  DeleteNodeDocument,
} from "@/gql/graphql"
import {
  layoutRoadmap,
  upsertById,
  asTags,
  asResources,
  type RoadmapNode,
  type RoadmapEdge,
  type RoadmapFlowNode,
  type RoadmapFlowEdge,
} from "@/lib/roadmap-graph"
import { useRoadmapGenerationStream } from "@/hooks/use-roadmap-generation"
import { RoadmapFlowNodeCard } from "@/components/roadmap/roadmap-flow-node"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export const Route = createFileRoute("/_authed/roadmaps/$id")({
  // `topic` present ⇒ a generation was just kicked off; the viewer subscribes
  // + polls until it settles, then clears the param.
  validateSearch: (
    search: Record<string, unknown>,
  ): { topic?: string } => ({
    topic: typeof search.topic === "string" ? search.topic : undefined,
  }),
  component: RoadmapViewPage,
})

// Stable reference — xyflow warns if nodeTypes is recreated each render.
const nodeTypes = { roadmap: RoadmapFlowNodeCard }

// Minimal structural view of the xyflow instance we actually use.
type FitViewInstance = {
  fitView: (opts?: { duration?: number; padding?: number }) => void
}

function RoadmapViewPage() {
  const { id } = Route.useParams()
  const roadmapId = Number(id)
  const search = Route.useSearch()
  const navigate = useNavigate()

  // While a generation is in flight, poll the persisted roadmap as a
  // progressive-reveal safety net — the live subscription gives instant
  // updates when connected, but polling guarantees nodes appear steadily even
  // if early socket events are missed. `onDone` clears `topic`, stopping it.
  const generating = !!search.topic
  const { data, refetch } = useQuery(GetRoadmapDocument, {
    variables: { id: roadmapId },
    pollInterval: generating ? 1000 : 0,
  })

  // Domain graph (from the query + streamed deltas + edits). This is the source
  // of truth; the xyflow flow state below is derived from it.
  const [rmNodes, setRmNodes] = useState<RoadmapNode[]>([])
  const [rmEdges, setRmEdges] = useState<RoadmapEdge[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const stableRef = useRef({ count: -1, ticks: 0 })

  useEffect(() => {
    if (!data?.roadmap) return
    const nodes = data.roadmap.nodes ?? []
    const edges = data.roadmap.edges ?? []
    setRmNodes(nodes)
    setRmEdges(edges)
    // Fallback completion: if the live `done` event is missed (e.g. the socket
    // connected late), stop once the persisted node count holds steady across a
    // few polls.
    if (generating) {
      if (nodes.length === stableRef.current.count) stableRef.current.ticks += 1
      else stableRef.current = { count: nodes.length, ticks: 0 }
      if (nodes.length > 0 && stableRef.current.ticks >= 4) {
        void navigate({
          to: "/roadmaps/$id",
          params: { id },
          search: {},
          replace: true,
        })
      }
    }
  }, [data, generating, id, navigate])

  // xyflow-owned state so nodes are draggable; positions live here, not in the
  // domain. We only re-run the dagre layout when the graph *structure* changes.
  const [flowNodes, setFlowNodes, onNodesChange] =
    useNodesState<RoadmapFlowNode>([])
  const [flowEdges, setFlowEdges, onEdgesChange] =
    useEdgesState<RoadmapFlowEdge>([])

  const rfRef = useRef<FitViewInstance | null>(null)
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
    [rmNodes, rmEdges],
  )

  // Reconcile domain -> flow. Structure change ⇒ full dagre re-layout (+ refit
  // so a growing/streaming graph stays in view). Data-only change ⇒ patch node
  // data while preserving dragged positions.
  useEffect(() => {
    if (structureKey !== lastStructureRef.current) {
      lastStructureRef.current = structureKey
      const laid = layoutRoadmap(rmNodes, rmEdges)
      setFlowNodes(laid.nodes)
      setFlowEdges(laid.edges)
      requestAnimationFrame(() =>
        rfRef.current?.fitView({ duration: 200, padding: 0.2 }),
      )
    } else {
      setFlowNodes((prev) =>
        prev.map((fn) => {
          const dn = rmNodes.find((n) => String(n.id) === fn.id)
          return dn ? { ...fn, data: { node: dn } } : fn
        }),
      )
    }
  }, [structureKey, rmNodes, rmEdges, setFlowNodes, setFlowEdges])

  // --- live generation ---
  const { status } = useRoadmapGenerationStream({
    roadmapId,
    enabled: generating,
    callbacks: {
      onNode: (node) => setRmNodes((prev) => upsertById(prev, node)),
      onEdges: (incoming) =>
        setRmEdges((prev) => incoming.reduce((acc, e) => upsertById(acc, e), prev)),
      onDone: () => {
        void refetch()
        void navigate({
          to: "/roadmaps/$id",
          params: { id },
          search: {},
          replace: true,
        })
      },
      onError: (message) => toast.error(message),
    },
  })

  // --- mutations / editing ---
  const [updateNode, { loading: updating }] = useMutation(UpdateNodeDocument)
  const [createNodeEdge] = useMutation(CreateNodeEdgeDocument)
  const [deleteNodeEdge] = useMutation(DeleteNodeEdgeDocument)
  const [deleteNode] = useMutation(DeleteNodeDocument)

  const toggleComplete = async (node: RoadmapNode) => {
    try {
      const res = await updateNode({
        variables: { input: { id: node.id, isCompleted: !node.isCompleted } },
      })
      const updated = res.data?.updateNode
      if (updated) setRmNodes((prev) => upsertById(prev, updated))
    } catch (e) {
      console.error(e)
      toast.error("Couldn't update the node.")
    }
  }

  const onConnect = useCallback(
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
    [createNodeEdge, roadmapId],
  )

  const onReconnect: OnReconnect = useCallback(
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
    [createNodeEdge, deleteNodeEdge, roadmapId],
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((e) => e.id))
      setRmEdges((prev) => prev.filter((e) => !ids.has(String(e.id))))
      for (const e of deleted) {
        deleteNodeEdge({ variables: { id: Number(e.id) } }).catch(() =>
          toast.error("Couldn't delete an edge."),
        )
      }
    },
    [deleteNodeEdge],
  )

  const onNodesDelete = useCallback(
    (deleted: { id: string }[]) => {
      const ids = new Set(deleted.map((n) => n.id))
      setRmNodes((prev) => prev.filter((n) => !ids.has(String(n.id))))
      setRmEdges((prev) =>
        prev.filter(
          (e) =>
            !ids.has(String(e.sourceNodeId)) && !ids.has(String(e.targetNodeId)),
        ),
      )
      for (const n of deleted) {
        deleteNode({ variables: { id: Number(n.id) } }).catch(() =>
          toast.error("Couldn't delete a node."),
        )
      }
    },
    [deleteNode],
  )

  const onNodeClick: NodeMouseHandler<RoadmapFlowNode> = (_, n) =>
    setSelectedId(Number(n.id))

  const selected = rmNodes.find((n) => n.id === selectedId) ?? null
  const title = data?.roadmap?.title ?? "Roadmap"
  const isStreaming = status === "streaming"

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-xl">{title}</h1>
            <p className="text-muted-foreground text-sm">
              {isStreaming
                ? "Generating your roadmap…"
                : `${rmNodes.length} topic${rmNodes.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {isStreaming ? <Spinner /> : null}
        </div>

        <div className="h-[72vh] overflow-hidden rounded-2xl border bg-muted/20">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            onNodeClick={onNodeClick}
            onInit={(instance) => {
              rfRef.current = instance as unknown as FitViewInstance
            }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <p className="text-muted-foreground text-xs">
          Drag a node's bottom dot onto another to set a prerequisite. Select an
          edge or node and press Delete to remove it.
        </p>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                {selected.description ? (
                  <p className="text-muted-foreground text-sm">
                    {selected.description}
                  </p>
                ) : null}

                {asTags(selected.tags).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {asTags(selected.tags).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {asResources(selected.resources).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm">Resources</p>
                    {asResources(selected.resources).map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <HugeiconsIcon
                          icon={LinkSquare02Icon}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{r.title ?? r.url}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="border-t p-4">
                <Button
                  className="w-full"
                  variant={selected.isCompleted ? "outline" : "default"}
                  disabled={updating}
                  onClick={() => toggleComplete(selected)}
                >
                  <HugeiconsIcon
                    icon={
                      selected.isCompleted ? Cancel01Icon : CheckmarkCircle02Icon
                    }
                    data-icon="inline-start"
                  />
                  {selected.isCompleted
                    ? "Mark as incomplete"
                    : "Mark as complete"}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}
