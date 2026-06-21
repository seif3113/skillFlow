import { useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useMutation } from "@apollo/client/react"
import { toast } from "sonner"
import { getApiError } from "@/lib/api-error"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LinkSquare02Icon,
  Quiz01Icon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  Globe02Icon,
  AiMagicIcon,
  Route01Icon,
} from "@hugeicons/core-free-icons"

import { AdaptNodeDocument } from "@/gql/graphql"
import { cn } from "@/lib/utils"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"
import { RoadmapAssistant } from "./roadmap-assistant"
import { AddTopicDialog } from "./add-topic-dialog"
import { useNodeQuiz, QuizQuestions, QuizResults } from "./node-quiz"
import { useNodeEditor, NodeEditFields, resetEditorToNode } from "./node-editor"
import { RoadmapViewProvider } from "./roadmap-view-provider"
import { useRoadmapView } from "./roadmap-view-context"
import {
  NodeSheetProvider,
  useNodeSheetControls,
  useNodeSheetState,
} from "./use-node-sheet"

// Stable reference — xyflow warns if nodeTypes is recreated each render.
const nodeTypes = { roadmap: RoadmapFlowNodeCard }

function RoadmapViewHeader() {
  const { state, actions } = useRoadmapView()
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{state.title}</h1>
        <p className="text-sm text-muted-foreground">
          {state.isStreaming
            ? "Generating your roadmap…"
            : `${state.nodeCount} topic${state.nodeCount === 1 ? "" : "s"}`}
        </p>
      </div>
      {state.isStreaming ? (
        <Spinner />
      ) : (
        <div className="flex items-center gap-2">
          <AddTopicDialog />
          <Button
            variant={state.isPublished ? "outline" : "default"}
            size="sm"
            onClick={actions.togglePublish}
          >
            <HugeiconsIcon icon={Globe02Icon} data-icon="inline-start" />
            {state.isPublished ? "Published" : "Publish"}
          </Button>
        </div>
      )}
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
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function RoadmapViewCanvas() {
  const { state, actions, meta } = useRoadmapView()
  const sheet = useNodeSheetControls()

  const onNodeClick: NodeMouseHandler<RoadmapFlowNode> = (_, n) => {
    actions.focusNode(Number(n.id))
    // `status` is precomputed on the flow node (mirrors the server-side gate).
    const locked = n.data.status === "locked"
    // Open the far-away sheet via the external store, carrying the node
    // snapshot + callbacks that sync the canvas on quiz-pass and on edit.
    sheet.open(n.data.node, {
      onPassed: () => actions.markCompleted(Number(n.id)),
      onUpdated: (updated) => actions.updateNode(updated),
      // Adapting inserts new remedial prerequisite nodes — refetch the graph.
      onAdapted: () => actions.refetchRoadmap(),
      locked,
    })
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

  // Empty roadmap (e.g. created blank): prompt to add a topic or use the AI.
  if (state.flowNodes.length === 0) {
    return (
      <div className="flex h-[72vh] items-center justify-center overflow-hidden rounded-2xl border bg-muted/20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Route01Icon} />
            </EmptyMedia>
            <EmptyTitle>No topics yet</EmptyTitle>
            <EmptyDescription>
              Add your first topic, or open the assistant and ask it to build
              the roadmap for you.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddTopicDialog variant="default" />
          </EmptyContent>
        </Empty>
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
        <Controls
          className="bg-background/90! text-muted-foreground!"
          showInteractive={false}
        />
        <Panel position="top-right">
          <CanvasLegend />
        </Panel>
      </ReactFlow>
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("size-2.5 rounded-full", swatch)} />
      {label}
    </div>
  )
}

// Key for the node status styling on the canvas.
function CanvasLegend() {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card/90 px-2.5 py-2 text-xs shadow-sm backdrop-blur">
      <LegendItem swatch="bg-primary" label="Completed" />
      <LegendItem swatch="border-2 border-primary/50" label="Available" />
      <LegendItem swatch="bg-muted-foreground/30" label="Locked" />
    </div>
  )
}

function RoadmapViewHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Drag a node's bottom dot onto another to set a prerequisite. Select an
      edge or node and press Delete to remove it.
    </p>
  )
}

// The full sheet body + footer for a node. Mounted with a per-node `key` so
// quiz/edit state resets when the node changes. The quiz (taking/results) and
// the edit form each replace the read-only info; actions live in the footer.
function NodeDetailContent({
  node: initialNode,
  onPassed,
  onUpdated,
  onAdapted,
  locked,
  onClose,
}: {
  node: RoadmapNode
  onPassed: () => void
  onUpdated: (node: RoadmapNode) => void
  onAdapted: () => void
  locked: boolean
  onClose: () => void
}) {
  // Local copy so edits + completion reflect immediately in this sheet without
  // a refetch; the canvas is kept in sync via onPassed / onUpdated.
  const [node, setNode] = useState(initialNode)
  const [editing, setEditing] = useState(false)
  const [adaptNode, { loading: adapting }] = useMutation(AdaptNodeDocument)

  // Adaptive learning: turn the questions the learner missed into remedial
  // prerequisite nodes, then refetch the canvas and close so they see them.
  const onAdapt = () => {
    adaptNode({ variables: { nodeId: node.id } })
      .then((res) => {
        const added = res.data?.adaptNode?.length ?? 0
        if (added > 0) {
          toast.success(
            `Added ${added} prerequisite topic${added === 1 ? "" : "s"} to strengthen this.`
          )
          onAdapted()
          onClose()
        } else {
          toast.message("Nothing to add — you didn't miss anything to review.")
        }
      })
      .catch((e) => toast.error(getApiError(e).message))
  }

  const quiz = useNodeQuiz(node.id, () => {
    setNode((n) => ({ ...n, isCompleted: true }))
    onPassed()
  })

  const form = useNodeEditor({
    node,
    onSaved: (updated) => {
      setNode((n) => ({ ...n, ...updated }))
      onUpdated(updated)
      setEditing(false)
    },
  })

  const startEdit = () => {
    resetEditorToNode(form, node)
    setEditing(true)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{node.title}</SheetTitle>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="px-6 pb-6">
          {editing ? (
            <NodeEditFields form={form} />
          ) : quiz.mode === "idle" ? (
            <div className="flex flex-col gap-4">
              {node.description ? (
                <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm font-medium">Resources</p>
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
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-4"
                  />
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
        </div>
      </ScrollArea>

      <SheetFooter>
        {editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  onClick={() => form.handleSubmit()}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                  Save changes
                </Button>
              )}
            </form.Subscribe>
          </>
        ) : quiz.mode === "idle" ? (
          <>
            <Button variant="outline" onClick={startEdit}>
              <HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
              Edit
            </Button>
            <Button
              variant={node.isCompleted ? "outline" : "default"}
              disabled={quiz.generating || locked}
              onClick={quiz.start}
            >
              {quiz.generating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon icon={Quiz01Icon} data-icon="inline-start" />
              )}
              {locked
                ? "Complete prerequisites first"
                : node.isCompleted
                  ? "Retake quiz"
                  : "Take quiz to complete"}
            </Button>
          </>
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
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={quiz.retry} disabled={adapting}>
              Try again
            </Button>
            <Button onClick={onAdapt} disabled={adapting}>
              {adapting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon icon={AiMagicIcon} data-icon="inline-start" />
              )}
              Strengthen weak spots
            </Button>
          </>
        )}
      </SheetFooter>
    </>
  )
}

// Mounted far from the canvas/provider (a sibling of RoadmapView.Provider) and
// driven by the external node-sheet store, so it re-renders ONLY on open/close
// — never during the canvas's churn — letting base-ui's transition run.
function RoadmapNodeSheet() {
  const { node, onPassed, onUpdated, onAdapted, locked, close } =
    useNodeSheetState()

  // Keep rendering the last node through the close animation so the content
  // doesn't blank out mid-transition.
  const lastNodeRef = useRef<RoadmapNode | null>(null)
  if (node) lastNodeRef.current = node
  const shown = node ?? lastNodeRef.current

  return (
    <Sheet open={node !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-md"
      >
        {shown ? (
          <NodeDetailContent
            key={shown.id}
            node={shown}
            onPassed={() => onPassed?.()}
            onUpdated={(updated) => onUpdated?.(updated)}
            onAdapted={() => onAdapted?.()}
            locked={locked}
            onClose={close}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// Compound component. `SheetProvider` + `Sheet` are mounted as siblings of
// `Provider` so the node detail sheet is decoupled from the canvas's render
// cycle.
export const RoadmapView = {
  Provider: RoadmapViewProvider,
  Header: RoadmapViewHeader,
  Canvas: RoadmapViewCanvas,
  Hint: RoadmapViewHint,
  Assistant: RoadmapAssistant,
  SheetProvider: NodeSheetProvider,
  Sheet: RoadmapNodeSheet,
}
