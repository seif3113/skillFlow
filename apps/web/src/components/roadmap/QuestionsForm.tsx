"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Question {
  id: string;
  question: string;
}

interface QuestionsFormProps {
  topic: string;
  questions: Question[];
  onSubmit: (answers: { questionId: string; question: string; answer: string }[]) => void;
  isLoading?: boolean;
}

export function QuestionsForm({ topic, questions, onSubmit, isLoading }: QuestionsFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || "",
    }));
    onSubmit(formattedAnswers);
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  return (
    <Card className="w-full max-w-2xl mx-auto border-zinc-800 bg-zinc-900">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-zinc-100">
          Let&apos;s Personalize Your Roadmap
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Answer these questions about <span className="text-sky-400 font-medium">{topic}</span> to get a tailored learning path
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-2">
              <Label htmlFor={q.id} className="text-zinc-200 text-base flex items-start gap-2">
                <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-sm font-mono">
                  {index + 1}
                </span>
                {q.question}
              </Label>
              <Textarea
                id={q.id}
                placeholder="Your answer..."
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-sky-500 min-h-[80px]"
                disabled={isLoading}
              />
            </div>
          ))}
          <Button
            type="submit"
            disabled={!allAnswered || isLoading}
            className="w-full text-white font-semibold py-6 text-lg"
            style={{ background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)' }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Roadmap...
              </span>
            ) : (
              "Generate My Roadmap"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
