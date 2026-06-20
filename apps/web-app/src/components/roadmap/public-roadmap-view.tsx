import { useEffect, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"
import {
  ReactFlow,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { GetRoadmapDocument, ForkRoadmapDocument } from "@/gql/graphql"
import {
  asResources,
  asTags,
  layoutRoadmap,
  type RoadmapNode,
  type RoadmapFlowNode,
  type RoadmapFlowEdge,
} from "@/lib/roadmap-graph"
import { authClient } from "@/lib/auth/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"

// Stable reference — xyflow warns if nodeTypes is recreated each render.
const nodeTypes = { roadmap: RoadmapFlowNodeCard }

// Forks a public roadmap into the current user's account, then opens the copy.
// The API ignores the userId arg (it uses the session) but the schema requires
// it, so we pass the session user's id.
export function ForkButton({
  roadmapId,
  variant = "default",
  size = "sm",
  className,
}: {
  roadmapId: number
  variant?: "default" | "outline" | "secondary"
  size?: "sm" | "default"
  className?: string
}) {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [fork, { loading }] = useMutation(ForkRoadmapDocument)

  const onFork = () => {
    fork({
      variables: { id: roadmapId, userId: Number(session?.user?.id ?? 0) },
    })
      .then((res) => {
        const newId = res.data?.forkRoadmap?.id
        if (!newId) return
        toast.success("Forked to your roadmaps.")
        void navigate({ to: "/roadmaps/$id", params: { id: String(newId) } })
      })
      .catch(() => toast.error("Couldn't fork this roadmap."))
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={onFork}
    >
      {loading ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
      )}
      Fork
    </Button>
  )
}

// Read-only viewer for a published roadmap. Reuses GetRoadmap (the API returns
// it to any authed user when it's published) and the canvas card, but disables
// all editing affordances. `headerActions` lets the route slot in Fork / back.
export function PublicRoadmapView({
  roadmapId,
  headerActions,
}: {
  roadmapId: number
  headerActions?: ReactNode
}) {
  const { data, loading } = useQuery(GetRoadmapDocument, {
    variables: { id: roadmapId },
  })
  const [selected, setSelected] = useState<RoadmapNode | null>(null)

  const [flowNodes, setFlowNodes, onNodesChange] =
    useNodesState<RoadmapFlowNode>([])
  const [flowEdges, setFlowEdges, onEdgesChange] =
    useEdgesState<RoadmapFlowEdge>([])

  useEffect(() => {
    const laid = layoutRoadmap(
      data?.roadmap?.nodes ?? [],
      data?.roadmap?.edges ?? []
    )
    setFlowNodes(laid.nodes)
    setFlowEdges(laid.edges)
  }, [data, setFlowNodes, setFlowEdges])

  const onNodeClick: NodeMouseHandler<RoadmapFlowNode> = (_, n) =>
    setSelected(n.data.node)

  const title = data?.roadmap?.title ?? "Roadmap"
  const count = data?.roadmap?.nodes?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {count} topic{count === 1 ? "" : "s"}
          </p>
        </div>
        {headerActions}
      </div>

      <div className="h-[72vh] overflow-hidden rounded-2xl border bg-muted/20">
        {loading && !data ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-16 w-56 rounded-2xl" />
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      <PublicNodeSheet node={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function PublicNodeSheet({
  node,
  onClose,
}: {
  node: RoadmapNode | null
  onClose: () => void
}) {
  // Keep rendering the last node through the close animation.
  const lastNodeRef = useRef<RoadmapNode | null>(null)
  if (node) lastNodeRef.current = node
  const shown = node ?? lastNodeRef.current

  return (
    <Sheet open={node !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-md"
      >
        {shown ? (
          <>
            <SheetHeader>
              <SheetTitle>{shown.title}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1" scrollFade>
              <div className="flex flex-col gap-4 px-6 pb-6">
                {shown.description ? (
                  <p className="text-sm text-muted-foreground">
                    {shown.description}
                  </p>
                ) : null}

                {asTags(shown.tags).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {asTags(shown.tags).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {asResources(shown.resources).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Resources</p>
                    {asResources(shown.resources).map((r, i) => (
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
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
