"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { TopicInput } from "./TopicInput";
import { QuestionsForm } from "./QuestionsForm";
import { RoadmapEditor } from "./RoadmapEditor";
import { questionsSchema, roadmapSchema } from "@/lib/schemas";
import { getLayoutedElements } from "@/lib/layout";
import type { Id } from "@/convex/_generated/dataModel";
import type { Node, Edge } from "@xyflow/react";

interface RoadmapCreatorProps {
  userId: Id<"users">;
}

export function RoadmapCreator({ userId }: RoadmapCreatorProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [roadmapId, setRoadmapId] = useState<Id<"roadmaps"> | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(false);

  // Track if we've saved to database
  const questionsSavedRef = useRef(false);
  const roadmapSavedRef = useRef(false);

  const createRoadmap = useMutation(api.roadmaps.create);
  const saveQuestions = useMutation(api.roadmaps.saveQuestions);
  const saveAnswers = useMutation(api.roadmaps.saveAnswers);
  const saveRoadmapData = useMutation(api.roadmaps.saveRoadmap);
  const updateNode = useMutation(api.roadmaps.updateNode);
  const updateLayout = useMutation(api.roadmaps.updateLayout);

  // AI hooks for streaming
  const {
    object: questionsObject,
    submit: submitQuestions,
    isLoading: isLoadingQuestions,
  } = useObject({
    api: "/api/generate-questions",
    schema: questionsSchema,
  });

  const {
    object: roadmapObject,
    submit: submitRoadmap,
    isLoading: isLoadingRoadmap,
  } = useObject({
    api: "/api/generate-roadmap",
    schema: roadmapSchema,
  });

  // Derive valid questions from streaming object
  const validQuestions = useMemo(() => {
    if (!questionsObject?.questions) return [];

    const result: { id: string; question: string }[] = [];
    for (const q of questionsObject.questions) {
      if (q && typeof q.id === "string" && typeof q.question === "string") {
        result.push({ id: q.id, question: q.question });
      }
    }
    return result;
  }, [questionsObject]);

  // Derive valid nodes and edges from streaming object
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!roadmapObject?.nodes || !roadmapObject?.edges) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const validNodes: { id: string; label: string; description: string; resources: { title: string; url: string }[] }[] = [];
    const validEdges: { source: string; target: string }[] = [];

    for (const n of roadmapObject.nodes) {
      if (
        n &&
        typeof n.id === "string" &&
        typeof n.label === "string" &&
        typeof n.description === "string" &&
        Array.isArray(n.resources)
      ) {
        const resources: { title: string; url: string }[] = [];
        for (const r of n.resources) {
          if (r && typeof r.title === "string" && typeof r.url === "string") {
            resources.push({ title: r.title, url: r.url });
          }
        }
        validNodes.push({
          id: n.id,
          label: n.label,
          description: n.description,
          resources,
        });
      }
    }

    for (const e of roadmapObject.edges) {
      if (e && typeof e.source === "string" && typeof e.target === "string") {
        validEdges.push({ source: e.source, target: e.target });
      }
    }

    if (validNodes.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    return getLayoutedElements(validNodes, validEdges);
  }, [roadmapObject]);

  // Derive the current step from data state (no setState needed)
  const step = useMemo(() => {
    // If we have layouted nodes and questions were answered, show editor
    if (layoutedNodes.length > 0 && !isLoadingRoadmap && questionsAnswered) {
      return "editor" as const;
    }
    // If questions were answered but roadmap not ready, show generating
    if (questionsAnswered) {
      return "generating" as const;
    }
    // If we have valid questions and not loading, show questions
    if (validQuestions.length > 0 && !isLoadingQuestions) {
      return "questions" as const;
    }
    // Default to topic input
    return "topic" as const;
  }, [validQuestions, isLoadingQuestions, layoutedNodes, isLoadingRoadmap, questionsAnswered]);

  // Save questions to database when ready
  useEffect(() => {
    if (
      validQuestions.length > 0 &&
      !isLoadingQuestions &&
      roadmapId &&
      !questionsSavedRef.current
    ) {
      questionsSavedRef.current = true;
      saveQuestions({ id: roadmapId, questions: validQuestions });
    }
  }, [validQuestions, isLoadingQuestions, roadmapId, saveQuestions]);

  // Save roadmap to database when ready
  useEffect(() => {
    if (
      layoutedNodes.length > 0 &&
      !isLoadingRoadmap &&
      roadmapId &&
      roadmapObject?.title &&
      !roadmapSavedRef.current
    ) {
      roadmapSavedRef.current = true;
      saveRoadmapData({
        id: roadmapId,
        title: roadmapObject.title,
        nodes: layoutedNodes.map((n: Node) => ({
          id: n.id,
          type: n.type || "roadmapNode",
          position: n.position,
          data: n.data as {
            label: string;
            description: string;
            resources: { title: string; url: string }[];
            completed: boolean;
          },
        })),
        edges: layoutedEdges.map((e: Edge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      });
    }
  }, [layoutedNodes, layoutedEdges, isLoadingRoadmap, roadmapId, roadmapObject?.title, saveRoadmapData]);

  const handleTopicSubmit = useCallback(
    async (submittedTopic: string) => {
      // Reset refs for new generation
      questionsSavedRef.current = false;
      roadmapSavedRef.current = false;
      setQuestionsAnswered(false);

      setTopic(submittedTopic);

      // Create roadmap in database
      const id = await createRoadmap({ userId, topic: submittedTopic });
      setRoadmapId(id);

      // Generate questions
      submitQuestions({ topic: submittedTopic });
    },
    [userId, createRoadmap, submitQuestions]
  );

  const handleQuestionsSubmit = useCallback(
    async (answers: { questionId: string; question: string; answer: string }[]) => {
      if (!roadmapId) return;

      // Save answers
      await saveAnswers({
        id: roadmapId,
        answers: answers.map((a) => ({ questionId: a.questionId, answer: a.answer })),
      });

      // Mark questions as answered to transition to generating step
      setQuestionsAnswered(true);

      // Generate roadmap
      submitRoadmap({
        topic,
        answers: answers.map((a) => ({ question: a.question, answer: a.answer })),
      });
    },
    [roadmapId, topic, saveAnswers, submitRoadmap]
  );

  const handleNodeUpdate = useCallback(
    async (nodeId: string, data: Partial<{ label: string; description: string; resources: { title: string; url: string }[]; completed: boolean }>) => {
      if (!roadmapId) return;
      await updateNode({ id: roadmapId, nodeId, data });
    },
    [roadmapId, updateNode]
  );

  const handleLayoutChange = useCallback(
    async (updatedNodes: Node[]) => {
      if (!roadmapId) return;
      await updateLayout({
        id: roadmapId,
        nodes: updatedNodes.map((n) => ({
          id: n.id,
          type: n.type || "roadmapNode",
          position: n.position,
          data: n.data as {
            label: string;
            description: string;
            resources: { title: string; url: string }[];
            completed: boolean;
          },
        })),
      });
    },
    [roadmapId, updateLayout]
  );

  // Count generated steps for progress display
  const generatedStepsCount = roadmapObject?.nodes
    ? roadmapObject.nodes.filter((n: { label?: string } | undefined) => n && n.label).length
    : 0;

  return (
    <div className="min-h-screen">
      {step === "topic" && (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <TopicInput onSubmit={handleTopicSubmit} isLoading={isLoadingQuestions} />
        </div>
      )}

      {step === "questions" && validQuestions.length > 0 && (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <QuestionsForm
            topic={topic}
            questions={validQuestions}
            onSubmit={handleQuestionsSubmit}
            isLoading={isLoadingRoadmap}
          />
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 animate-pulse" style={{ background: 'linear-gradient(90deg, #0284c7 0%, #2dd4bf 100%)' }}>
            <svg
              className="w-8 h-8 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            Generating Your Roadmap
          </h2>
          <p className="text-zinc-400 text-center max-w-md">
            AI is creating a personalized learning path based on your answers...
          </p>

          {/* Show partial roadmap while generating */}
          {roadmapObject?.title && (
            <p className="text-sky-400 mt-4 font-medium">
              {roadmapObject.title}
            </p>
          )}
          {generatedStepsCount > 0 && (
            <p className="text-zinc-500 text-sm mt-2">
              {generatedStepsCount} steps generated...
            </p>
          )}
        </div>
      )}

      {step === "editor" && layoutedNodes.length > 0 && (
        <div className="h-screen flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                {roadmapObject?.title || topic}
              </h1>
              <p className="text-sm text-zinc-400">
                Click on any step to view details and edit
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
          <div className="flex-1">
            <RoadmapEditor
              initialNodes={layoutedNodes}
              initialEdges={layoutedEdges}
              onNodesChange={handleLayoutChange}
              onNodeUpdate={handleNodeUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
