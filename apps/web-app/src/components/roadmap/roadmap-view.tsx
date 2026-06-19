import { ReactFlow, Background, Controls, type NodeMouseHandler } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons"

import { asTags, asResources, type RoadmapFlowNode } from "@/lib/roadmap-graph"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"
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

function RoadmapViewCanvas() {
  const { state, actions, meta } = useRoadmapView()

  const onNodeClick: NodeMouseHandler<RoadmapFlowNode> = (_, n) =>
    actions.selectNode(Number(n.id))

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
  const { state, actions, meta } = useRoadmapView()
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
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
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
            <div className="border-t p-4">
              <Button
                className="w-full"
                variant={node.isCompleted ? "outline" : "default"}
                disabled={meta.updating}
                onClick={() => actions.toggleComplete(node)}
              >
                <HugeiconsIcon
                  icon={node.isCompleted ? Cancel01Icon : CheckmarkCircle02Icon}
                  data-icon="inline-start"
                />
                {node.isCompleted ? "Mark as incomplete" : "Mark as complete"}
              </Button>
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
