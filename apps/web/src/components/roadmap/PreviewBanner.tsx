"use client";

import { Sparkles, Check, Trash2 } from "lucide-react";

interface PreviewBannerProps {
  isOpen: boolean;
  onApply: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}

export function PreviewBanner({
  isOpen,
  onApply,
  onDiscard,
  isSaving,
}: PreviewBannerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-between gap-6 px-6 py-3 bg-background/95 border border-border shadow-2xl rounded-2xl animate-in slide-in-from-top duration-300 w-full max-w-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg animate-pulse">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">
            Review Proposed AI Changes
          </h4>
          <p className="text-[10px] text-muted-foreground">
            Review node updates before applying them to your roadmap.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 text-xs font-semibold text-muted-foreground transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Discard</span>
        </button>
        <button
          onClick={onApply}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md shadow-emerald-500/10"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Apply Changes</span>
        </button>
      </div>
    </div>
  );
}
