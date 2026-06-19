import { ReactFlow, Background, Controls, type NodeMouseHandler } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { asTags, asResources, type RoadmapFlowNode } from "@/lib/roadmap-graph"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"
import { NodeQuizPanel } from "./node-quiz-panel"
import { RoadmapViewProvider } from "./roadmap-view-provider"
import { useRoadmapView } from "./roadmap-view-context"

// Stable reference — xyflow warns if nodeTypes is recreated each render.
const nodeTypes = { roadmap: RoadmapFlowNodeCard }

function RoadmapViewHeader() {
  const { state } = useRoadmapView()
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-xl">{state.title}</h1>
        <p className="text-muted-foreground text-sm">
          {state.isStreaming
            ? "Generating your roadmap…"
            : `${state.nodeCount} topic${state.nodeCount === 1 ? "" : "s"}`}
        </p>
      </div>
      {state.isStreaming ? <Spinner /> : null}
    </div>
  )
}

function RoadmapCanvasSkeleton({ label }: { label: string }) {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-8">
      {/* A faint, pulsing DAG silhouette: root → parallel branch → merge. */}
      <div className="flex flex-col items-center gap-4 opacity-50">
        <Skeleton className="h-16 w-56 rounded-2xl" />
        <Skeleton className="h-6 w-px" />
        <div className="flex gap-5">
          <Skeleton className="h-16 w-44 rounded-2xl" />
          <Skeleton className="h-16 w-44 rounded-2xl" />
        </div>
        <Skeleton className="h-6 w-px" />
        <Skeleton className="h-16 w-52 rounded-2xl" />
      </div>

      {/* Centered spinner + label over a subtle scrim. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-[1px]">
        <Spinner className="size-7 text-primary" />
        <p className="font-medium text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  )
}

function RoadmapViewCanvas() {
  const { state, actions, meta } = useRoadmapView()

  const onNodeClick: NodeMouseHandler<RoadmapFlowNode> = (_, n) => {
    actions.selectNode(Number(n.id))
    actions.focusNode(Number(n.id))
  }

  // Show a skeleton before the first nodes exist — whether we're loading an
  // existing roadmap or waiting on the first streamed node of a new one.
  if (state.flowNodes.length === 0 && (state.isLoading || state.isStreaming)) {
    return (
      <div className="h-[72vh] overflow-hidden rounded-2xl border bg-muted/20">
        <RoadmapCanvasSkeleton
          label={state.isStreaming ? "Generating your roadmap…" : "Loading…"}
        />
      </div>
    )
  }

  return (
    <div className="h-[72vh] overflow-hidden rounded-2xl border bg-muted/20">
      <ReactFlow
        nodes={state.flowNodes}
        edges={state.flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={actions.onNodesChange}
        onEdgesChange={actions.onEdgesChange}
        onConnect={actions.connect}
        onReconnect={actions.reconnect}
        onEdgesDelete={actions.deleteEdges}
        onNodesDelete={actions.deleteNodes}
        onNodeClick={onNodeClick}
        onInit={meta.registerInstance}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

function RoadmapViewHint() {
  return (
    <p className="text-muted-foreground text-xs">
      Drag a node's bottom dot onto another to set a prerequisite. Select an edge
      or node and press Delete to remove it.
    </p>
  )
}

function RoadmapViewNodeDetail() {
  const { state, actions } = useRoadmapView()
  const node = state.selectedNode

  return (
    <Sheet
      open={node !== null}
      onOpenChange={(open) => !open && actions.selectNode(null)}
    >
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {node ? (
          <>
            <SheetHeader>
              <SheetTitle>{node.title}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex flex-col gap-4 px-4 pb-4">
                {node.description ? (
                  <p className="text-muted-foreground text-sm">
                    {node.description}
                  </p>
                ) : null}

                {asTags(node.tags).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {asTags(node.tags).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {asResources(node.resources).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm">Resources</p>
                    {asResources(node.resources).map((r, i) => (
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

              {/* Quiz-gated completion: passing the quiz is the only way to
                  complete the node. `key` resets the panel per node. */}
              <NodeQuizPanel
                key={node.id}
                nodeId={node.id}
                isCompleted={node.isCompleted}
                onPassed={() => actions.markCompleted(node.id)}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// Compound component: a provider that lifts all state + composable UI parts that
// consume it through context. Compose only the pieces a given screen needs.
export const RoadmapView = {
  Provider: RoadmapViewProvider,
  Header: RoadmapViewHeader,
  Canvas: RoadmapViewCanvas,
  Hint: RoadmapViewHint,
  NodeDetail: RoadmapViewNodeDetail,
}
