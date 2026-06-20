import { useState, type FormEvent, type KeyboardEvent } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isToolUIPart } from "ai"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiChat02Icon,
  ArrowUp01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { useRoadmapView } from "./roadmap-view-context"

// Decoupled chat panel built on AI Elements. Lives inside RoadmapView.Provider
// so it can refetch the canvas after the agent edits the roadmap server-side.
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

  const send = () => {
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <TooltipProvider>
      <aside className="flex h-[72vh] w-[380px] shrink-0 flex-col rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={AiChat02Icon}
              className="size-4 text-primary"
            />
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

        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<HugeiconsIcon icon={AiChat02Icon} className="size-10" />}
                title="Ask about this roadmap"
                description="Or tell me to add, edit, or link topics."
              />
            ) : (
              messages.map((m) => (
                <Message from={m.role} key={m.id}>
                  <MessageContent>
                    {m.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={i}>{part.text}</MessageResponse>
                        )
                      }
                      if (isToolUIPart(part) && part.type !== "dynamic-tool") {
                        return (
                          <Tool key={i}>
                            <ToolHeader type={part.type} state={part.state} />
                            <ToolContent>
                              <ToolInput input={part.input} />
                              <ToolOutput
                                output={
                                  part.state === "output-available" ? (
                                    <pre className="overflow-x-auto text-xs">
                                      {JSON.stringify(part.output, null, 2)}
                                    </pre>
                                  ) : undefined
                                }
                                errorText={
                                  part.state === "output-error"
                                    ? part.errorText
                                    : undefined
                                }
                              />
                            </ToolContent>
                          </Tool>
                        )
                      }
                      return null
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask or instruct…"
            rows={1}
            className="max-h-40 min-h-9 flex-1 rounded-lg px-3 py-1 sm:min-h-8"
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
    </TooltipProvider>
  )
}
