import { z } from "zod";

/**
 * Schema for AI-generated questions
 */
export const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the question"),
        question: z
          .string()
          .describe("The question to ask the user about their experience"),
      })
    )
    .min(3)
    .max(5)
    .describe("3-5 clarifying questions to understand user's experience level and goals"),
});

export type QuestionsOutput = z.infer<typeof questionsSchema>;

/**
 * Schema for AI-generated roadmap
 */
export const roadmapSchema = z.object({
  title: z.string().describe("A concise title for the roadmap"),
  nodes: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the node"),
        label: z.string().describe("Short name for this step (2-4 words)"),
        description: z
          .string()
          .describe("Detailed explanation of what to learn in this step"),
        resources: z
          .array(
            z.object({
              title: z.string().describe("Name of the resource"),
              url: z.string().url().describe("URL to the resource"),
            })
          )
          .describe("2-4 helpful resources for this step"),
      })
    )
    .min(5)
    .max(15)
    .describe("The learning steps in the roadmap"),
  edges: z
    .array(
      z.object({
        source: z.string().describe("ID of the source node"),
        target: z.string().describe("ID of the target node"),
      })
    )
    .describe("Connections between nodes showing the learning path"),
});

export type RoadmapOutput = z.infer<typeof roadmapSchema>;

