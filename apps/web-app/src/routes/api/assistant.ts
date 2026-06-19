import { createFileRoute } from "@tanstack/react-router"
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai"
import { createGroq } from "@ai-sdk/groq"

import { GetRoadmapDocument } from "@/gql/graphql"
import { serverGraphQL } from "@/lib/assistant/server-graphql"
import { buildAssistantTools } from "@/lib/assistant/tools"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = process.env.GROQ_ASSISTANT_MODEL ?? "llama-3.3-70b-versatile"

// Serialize the roadmap so the agent can answer questions and reference node ids
// when editing. Refetched each turn so it sees its own prior edits.
async function buildContext(
  roadmapId: number,
  cookie: string | null
): Promise<string> {
  try {
    const data = await serverGraphQL(
      GetRoadmapDocument,
      { id: roadmapId },
      cookie
    )
    const r = data.roadmap
    if (!r) return "The roadmap could not be loaded."
    const nodes =
      (r.nodes ?? [])
        .map(
          (n) =>
            `- [${n.id}] ${n.title}${n.isCompleted ? " (completed)" : ""}${
              n.description ? ` — ${n.description}` : ""
            }`
        )
        .join("\n") || "(no topics yet)"
    const edges =
      (r.edges ?? [])
        .map((e) => `- ${e.sourceNodeId} -> ${e.targetNodeId}`)
        .join("\n") || "(no links yet)"
    return `Roadmap "${r.title}" (id ${roadmapId}).\n\nTopics [id] title:\n${nodes}\n\nPrerequisite links (prerequisiteId -> nodeId):\n${edges}`
  } catch {
    return "The roadmap could not be loaded."
  }
}

const SYSTEM = (context: string) =>
  `You are SkillFlow's roadmap assistant. You help the user understand and improve THIS learning roadmap.

You can:
- Answer questions about the roadmap (what to learn next, how topics relate, what's missing, explain a topic).
- Edit the roadmap directly using your tools: add/update/delete topics, link/unlink prerequisites, search for and attach learning resources.

Guidelines:
- Prefer concrete edits over describing what you would do; when the user asks for a change, make it with the tools.
- When you add topics that build on others, link prerequisites so the graph stays a sensible DAG.
- Reference topics by their id from the context below when editing.
- Before deleting a topic, confirm with the user unless they clearly asked to delete it.
- Keep replies concise. After editing, briefly summarize what you changed.

Current roadmap:
${context}`

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, roadmapId } = (await request.json()) as {
          messages: UIMessage[]
          roadmapId: number
        }
        const cookie = request.headers.get("cookie")
        const context = await buildContext(roadmapId, cookie)

        const result = streamText({
          model: groq(MODEL),
          system: SYSTEM(context),
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(8),
          tools: buildAssistantTools({ cookie, roadmapId }),
          // Force sequential tool calls. Several tools read-then-write the
          // roadmap (e.g. attachResources), so parallel calls would race and
          // drop edits; it also avoids Groq's malformed parallel tool calls.
          providerOptions: { groq: { parallelToolCalls: false } },
        })

        return result.toUIMessageStreamResponse({
          onError: (error) =>
            error instanceof Error ? error.message : "Something went wrong.",
        })
      },
    },
  },
})
