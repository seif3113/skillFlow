import { ReactFlow, Background, Controls, type NodeMouseHandler } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LinkSquare02Icon,
  Quiz01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"

import {
  asTags,
  asResources,
  type RoadmapNode,
  type RoadmapFlowNode,
} from "@/lib/roadmap-graph"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerPanel,
  DrawerFooter,
} from "@/components/ui/drawer"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"
import { useNodeQuiz, QuizQuestions, QuizResults } from "./node-quiz"
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

// The full drawer body + footer for a node. Mounted with a per-node `key` so
// quiz state resets when the selected node changes. The quiz (taking/results)
// replaces the node info entirely; actions live in the footer.
function NodeDetailContent({
  node,
  onPassed,
}: {
  node: RoadmapNode
  onPassed: () => void
}) {
  const quiz = useNodeQuiz(node.id, onPassed)

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{node.title}</DrawerTitle>
      </DrawerHeader>

      <DrawerPanel>
        {quiz.mode === "idle" ? (
          <div className="flex flex-col gap-4">
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

            {node.isCompleted ? (
              <div className="flex items-center gap-2 font-medium text-primary text-sm">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
                Completed
              </div>
            ) : null}
          </div>
        ) : quiz.mode === "taking" && quiz.quiz ? (
          <QuizQuestions
            quiz={quiz.quiz}
            answers={quiz.answers}
            onAnswer={quiz.setAnswer}
          />
        ) : quiz.mode === "result" && quiz.quiz && quiz.result ? (
          <QuizResults
            quiz={quiz.quiz}
            result={quiz.result}
            answers={quiz.answers}
          />
        ) : null}
      </DrawerPanel>

      <DrawerFooter>
        {quiz.mode === "idle" ? (
          <Button
            className="w-full"
            variant={node.isCompleted ? "outline" : "default"}
            disabled={quiz.generating}
            onClick={quiz.start}
          >
            {quiz.generating ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={Quiz01Icon} data-icon="inline-start" />
            )}
            {node.isCompleted ? "Retake quiz" : "Take quiz to complete"}
          </Button>
        ) : quiz.mode === "taking" ? (
          <>
            <Button
              variant="ghost"
              onClick={quiz.reset}
              disabled={quiz.submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={quiz.submitAttempt}
              disabled={!quiz.allAnswered || quiz.submitting}
            >
              {quiz.submitting ? <Spinner data-icon="inline-start" /> : null}
              Submit answers
            </Button>
          </>
        ) : quiz.result?.passed ? (
          <Button className="w-full" onClick={quiz.reset}>
            Done
          </Button>
        ) : (
          <Button className="w-full" onClick={quiz.retry}>
            Try again
          </Button>
        )}
      </DrawerFooter>
    </>
  )
}

function RoadmapViewNodeDetail() {
  const { state, actions } = useRoadmapView()
  const node = state.selectedNode

  return (
    <Drawer
      open={node !== null}
      onOpenChange={(open) => !open && actions.selectNode(null)}
      position="right"
    >
      <DrawerPopup>
        {node ? (
          <NodeDetailContent
            key={node.id}
            node={node}
            onPassed={() => actions.markCompleted(node.id)}
          />
        ) : null}
      </DrawerPopup>
    </Drawer>
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
