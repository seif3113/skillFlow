import { useState, type FormEvent } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isToolUIPart } from "ai"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiChat02Icon,
  AiMagicIcon,
  ArrowUp01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useRoadmapView } from "./roadmap-view-context"

const TOOL_LABELS: Record<string, string> = {
  addNode: "Add topic",
  updateNode: "Edit topic",
  deleteNode: "Delete topic",
  linkNodes: "Link topics",
  unlinkNodes: "Unlink topics",
  searchResources: "Search resources",
  attachResource: "Attach resource",
}

// Docked, decoupled chat panel. Lives inside RoadmapView.Provider so it can
// refetch the canvas after the agent edits the roadmap server-side.
export function RoadmapAssistant({ onClose }: { onClose: () => void }) {
  const { meta, actions } = useRoadmapView()
  const [input, setInput] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/assistant",
      credentials: "include",
      body: { roadmapId: meta.roadmapId },
    }),
    // The agent mutates the roadmap server-side; pull the changes onto the canvas.
    onFinish: () => actions.refetchRoadmap(),
  })

  const busy = status === "submitted" || status === "streaming"

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <aside className="flex h-[72vh] w-[380px] shrink-0 flex-col rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={AiChat02Icon} className="size-4 text-primary" />
          <span className="text-sm font-medium">Assistant</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close assistant"
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="m-auto max-w-[260px] text-center text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={AiChat02Icon}
              className="mx-auto mb-2 size-6 opacity-60"
            />
            Ask about this roadmap, or tell me to add, edit, or link topics.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-1.5",
                m.role === "user" ? "items-end" : "items-start"
              )}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <div
                      key={i}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {part.text}
                    </div>
                  )
                }
                if (isToolUIPart(part)) {
                  const name = part.type.replace("tool-", "")
                  const label = TOOL_LABELS[name] ?? name
                  const done = part.state === "output-available"
                  const failed = part.state === "output-error"
                  const info = part.input as { title?: string } | undefined
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
                    >
                      {done || failed ? (
                        <HugeiconsIcon
                          icon={AiMagicIcon}
                          className={cn(
                            "size-3.5",
                            failed ? "text-destructive" : "text-primary"
                          )}
                        />
                      ) : (
                        <Spinner className="size-3.5" />
                      )}
                      <span>
                        {label}
                        {info?.title ? `: ${info.title}` : ""}
                      </span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          ))
        )}
        {status === "submitted" ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : null}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or instruct…"
          disabled={busy}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          {busy ? <Spinner /> : <HugeiconsIcon icon={ArrowUp01Icon} />}
        </Button>
      </form>
    </aside>
  )
}
