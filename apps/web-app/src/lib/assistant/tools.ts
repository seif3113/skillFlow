import { tool } from "ai"
import { z } from "zod"
import type { TypedDocumentNode } from "@graphql-typed-document-node/core"

import {
  CreateNodeDocument,
  UpdateNodeDocument,
  DeleteNodeDocument,
  CreateNodeEdgeDocument,
  DeleteNodeEdgeDocument,
  SearchNodeResourcesDocument,
  GetRoadmapDocument,
} from "@/gql/graphql"
import { serverGraphQL } from "./server-graphql"

// Tool set the agent can call. Each tool maps to an existing ownership-checked
// GraphQL mutation, executed as the current user (cookie forwarded), so the API
// stays the single source of truth for auth + validation. Tools are intentionally
// node/edge-oriented (the model thinks in topics), not raw DB access.
export function buildAssistantTools({
  cookie,
  roadmapId,
}: {
  cookie: string | null
  roadmapId: number
}) {
  function gql<TData, TVars>(
    document: TypedDocumentNode<TData, TVars>,
    variables: TVars
  ): Promise<TData> {
    return serverGraphQL(document, variables, cookie)
  }

  return {
    addNode: tool({
      description: "Add a new topic (node) to the roadmap.",
      inputSchema: z.object({
        title: z.string().describe("Short topic title"),
        description: z
          .string()
          .optional()
          .describe("A 1-3 sentence explanation of the topic"),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ title, description, tags }) => {
        const data = await gql(CreateNodeDocument, {
          input: { roadmapId, title, description, tags },
        })
        return { id: data.createNode.id, title: data.createNode.title }
      },
    }),

    updateNode: tool({
      description: "Edit an existing topic's title, description, or tags.",
      inputSchema: z.object({
        id: z.number().describe("The topic (node) id"),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ id, title, description, tags }) => {
        const data = await gql(UpdateNodeDocument, {
          input: { id, title, description, tags },
        })
        return { id: data.updateNode.id, title: data.updateNode.title }
      },
    }),

    deleteNode: tool({
      description:
        "Delete a topic (node) and its links. Confirm with the user first unless they clearly asked to delete it.",
      inputSchema: z.object({ id: z.number() }),
      execute: async ({ id }) => {
        await gql(DeleteNodeDocument, { id })
        return { deletedId: id }
      },
    }),

    linkNodes: tool({
      description:
        "Add a prerequisite link so the learner finishes `prerequisiteNodeId` before `nodeId`.",
      inputSchema: z.object({
        prerequisiteNodeId: z.number(),
        nodeId: z.number(),
      }),
      execute: async ({ prerequisiteNodeId, nodeId }) => {
        const data = await gql(CreateNodeEdgeDocument, {
          roadmapId,
          sourceNodeId: prerequisiteNodeId,
          targetNodeId: nodeId,
        })
        return { edgeId: data.createNodeEdge.id }
      },
    }),

    unlinkNodes: tool({
      description: "Remove the prerequisite link between two topics.",
      inputSchema: z.object({
        prerequisiteNodeId: z.number(),
        nodeId: z.number(),
      }),
      execute: async ({ prerequisiteNodeId, nodeId }) => {
        const data = await gql(GetRoadmapDocument, { id: roadmapId })
        const edge = (data.roadmap?.edges ?? []).find(
          (e) =>
            e.sourceNodeId === prerequisiteNodeId && e.targetNodeId === nodeId
        )
        if (!edge) return { ok: false, reason: "No such link" }
        await gql(DeleteNodeEdgeDocument, { id: edge.id })
        return { ok: true, removedEdgeId: edge.id }
      },
    }),

    searchResources: tool({
      description:
        "Search for learning resources (videos, articles, courses) on a topic. Returns options; use attachResources to add them to a node in one call.",
      inputSchema: z.object({
        topic: z.string(),
        type: z.enum(["all", "video", "article", "course"]).optional(),
      }),
      execute: async ({ topic, type }) => {
        const data = await gql(SearchNodeResourcesDocument, {
          topic,
          limit: 5,
          type: type ?? "all",
        })
        const results = Array.isArray(data.searchNodeResources)
          ? data.searchNodeResources
          : []
        return { results }
      },
    }),

    attachResources: tool({
      description:
        "Attach one or more learning resources (each with a URL) to a topic node. Pass ALL resources for a node in a single call — do not call this multiple times for the same node.",
      inputSchema: z.object({
        nodeId: z.number(),
        resources: z
          .array(
            z.object({
              title: z.string(),
              url: z.string(),
              type: z.string().optional(),
            })
          )
          .min(1),
      }),
      execute: async ({ nodeId, resources }) => {
        const data = await gql(GetRoadmapDocument, { id: roadmapId })
        const node = (data.roadmap?.nodes ?? []).find((n) => n.id === nodeId)
        if (!node) return { ok: false, reason: "No such node" }
        const existing = Array.isArray(node.resources) ? node.resources : []
        await gql(UpdateNodeDocument, {
          input: { id: nodeId, resources: [...existing, ...resources] },
        })
        return { ok: true, nodeId, added: resources.length }
      },
    }),
  }
}
