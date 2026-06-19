"use client";

import { useState } from "react";
import { Sparkles, X, Wand2, ArrowRight } from "lucide-react";

interface AiEditBottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export function AiEditBottomPanel({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AiEditBottomPanelProps) {
  const [prompt, setPrompt] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 p-6 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Edit Roadmap by AI
              </h3>
              <p className="text-xs text-muted-foreground">
                Describe the changes you want to make, and AI will propose a new
                structure.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative flex gap-3">
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Add a section for Docker and containerization before the deployment node..."
              className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 pr-12"
            />
            <div className="absolute right-3 bottom-3 text-[10px] text-muted-foreground font-medium">
              {prompt.length} / 500
            </div>
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-6 rounded-xl bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-50 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-sky-500/15 group min-w-[120px]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>Generate</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
