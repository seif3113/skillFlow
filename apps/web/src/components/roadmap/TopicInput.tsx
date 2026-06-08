"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isLoading?: boolean;
}

export function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-zinc-800 bg-zinc-900">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
          Create Your Learning Roadmap
        </CardTitle>
        <CardDescription className="text-zinc-400 text-lg">
          Enter a topic you want to learn, and AI will create a personalized roadmap for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            placeholder="e.g., Machine Learning, Web Development, Rust Programming..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-sky-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!topic.trim() || isLoading}
            className="text-white font-semibold px-8"
            style={{ background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)' }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
