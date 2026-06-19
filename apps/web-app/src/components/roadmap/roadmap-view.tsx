import { useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LinkSquare02Icon,
  Quiz01Icon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  Globe02Icon,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { RoadmapFlowNodeCard } from "./roadmap-flow-node"
import { RoadmapAssistant } from "./roadmap-assistant"
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
        <Button
          variant={state.isPublished ? "outline" : "default"}
          size="sm"
          onClick={actions.togglePublish}
        >
          <HugeiconsIcon icon={Globe02Icon} data-icon="inline-start" />
          {state.isPublished ? "Published" : "Publish"}
        </Button>
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
    // Open the far-away sheet via the external store, carrying the node
    // snapshot + callbacks that sync the canvas on quiz-pass and on edit.
    sheet.open(n.data.node, {
      onPassed: () => actions.markCompleted(Number(n.id)),
      onUpdated: (updated) => actions.updateNode(updated),
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
  onClose,
}: {
  node: RoadmapNode
  onPassed: () => void
  onUpdated: (node: RoadmapNode) => void
  onClose: () => void
}) {
  // Local copy so edits + completion reflect immediately in this sheet without
  // a refetch; the canvas is kept in sync via onPassed / onUpdated.
  const [node, setNode] = useState(initialNode)
  const [editing, setEditing] = useState(false)

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
          <Button className="w-full" onClick={quiz.retry}>
            Try again
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

// Mounted far from the canvas/provider (a sibling of RoadmapView.Provider) and
// driven by the external node-sheet store, so it re-renders ONLY on open/close
// — never during the canvas's churn — letting base-ui's transition run.
function RoadmapNodeSheet() {
  const { node, onPassed, onUpdated, close } = useNodeSheetState()

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
