"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopicInput } from "./TopicInput";
import { QuestionsForm } from "./QuestionsForm";
import { useCreateRoadmap, useRoadmapCustomizationQuestions } from "@/hooks/useRoadmap";

interface RoadmapCreatorProps {
  userId: number;
  initialTopic?: string;
}

export function RoadmapCreator({ userId, initialTopic }: RoadmapCreatorProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [step, setStep] = useState<"topic" | "questions" | "generating">("topic");
  const [runQuery, setRunQuery] = useState(false);

  const { mutateAsync: createRoadmap } = useCreateRoadmap();

  const { 
    data: customizationQuestions, 
    isFetching: isQuestionsLoading,
    refetch: fetchQuestions
  } = useRoadmapCustomizationQuestions(topic, runQuery);

  const handleTopicSubmit = useCallback(
    (submittedTopic: string) => {
      setTopic(submittedTopic);
      setRunQuery(true);
      setTimeout(() => {
        fetchQuestions().then((res) => {
          if (res.data && res.data.length > 0) {
            setStep("questions");
          } else {
            // If no questions, just go straight to generating
            handleCreateAndRedirect(submittedTopic, []);
          }
        });
      }, 50);
    },
    [fetchQuestions],
  );

  useEffect(() => {
    if (initialTopic && step === "topic") {
      handleTopicSubmit(initialTopic);
    }
  }, [initialTopic, step, handleTopicSubmit]);

  const handleCreateAndRedirect = async (
    targetTopic: string,
    answers: string[],
  ) => {
    setStep("generating");
    try {
      const res = await createRoadmap({
        userId,
        title: targetTopic,
        description: `Generated learning path for ${targetTopic}`,
      });
      
      const newRoadmapId = res.createRoadmap.id;
      
      const url = new URL(`/roadmap/${newRoadmapId}`, window.location.origin);
      url.searchParams.set("topic", targetTopic);
      if (answers.length > 0) {
        url.searchParams.set("answers", JSON.stringify(answers));
      }
      
      router.push(url.pathname + url.search);
    } catch (error) {
      console.error("Failed to create roadmap", error);
      setStep("topic"); // Reset on error
    }
  };

  const handleQuestionsSubmit = useCallback(
    (answersObj: { questionId: string; question: string; answer: string }[]) => {
      // Map back to just the answers array
      const answersList = answersObj.map((a) => a.answer);
      handleCreateAndRedirect(topic, answersList);
    },
    [topic],
  );

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {step === "topic" && (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <TopicInput
            onSubmit={handleTopicSubmit}
            isLoading={isQuestionsLoading}
          />
        </div>
      )}

      {step === "questions" && customizationQuestions && customizationQuestions.length > 0 && (
        <div className="flex items-center justify-center min-h-[60vh] p-6 animate-in fade-in zoom-in-95">
          <QuestionsForm
            topic={topic}
            questions={customizationQuestions.map((q: any, i: number) => ({ id: String(i), question: q.question, choices: q.choices }))}
            onSubmit={handleQuestionsSubmit}
            isLoading={false}
          />
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-in fade-in zoom-in-95">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-2xl shadow-sky-500/50"
            style={{
              background: "linear-gradient(90deg, #0284c7 0%, #2dd4bf 100%)",
            }}
          >
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
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Preparing Your Roadmap
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Setting up the canvas for streaming generation...
          </p>
        </div>
      )}
    </div>
  );
}
