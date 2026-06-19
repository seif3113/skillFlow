"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, BookOpen, Sparkles } from "lucide-react";

export interface RoadmapNodeData {
  label: string;
  description: string;
  resources: {
    title: string;
    url: string;
    description?: string;
    type?: string;
  }[];
  completed: boolean;
  isReadOnly?: boolean;
  diffState?: "added" | "modified" | "deleted";
  isSkeleton?: boolean;
}

function RoadmapNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapNodeData;
  const { diffState, isSkeleton } = nodeData;

  if (isSkeleton) {
    return (
      <div className="relative w-[260px] rounded-xl border-2 p-5 bg-card/40 backdrop-blur-sm border-border/50 shadow-xl overflow-hidden group">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-sky-500/10 to-transparent" />
        
        {/* Pulsing border glow */}
        <div className="absolute inset-0 border-2 border-sky-500/20 rounded-xl animate-pulse" />

        <Handle type="target" position={Position.Top} className="opacity-0" />
        
        <div className="flex flex-col gap-4 relative z-10">
          <div className="h-5 w-3/4 bg-muted/80 rounded-md animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted/40 rounded-md animate-pulse" />
            <div className="h-3 w-5/6 bg-muted/40 rounded-md animate-pulse" />
            <div className="h-3 w-4/6 bg-muted/40 rounded-md animate-pulse" />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="h-4 w-1/3 bg-muted/30 rounded-md animate-pulse" />
            <div className="h-4 w-6 bg-muted/30 rounded-full animate-pulse" />
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // Visual diff style mappings
  let diffContainerClass = "";
  if (diffState === "added") {
    diffContainerClass = "border-green-500/80 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.15)]";
  } else if (diffState === "modified") {
    diffContainerClass = "border-yellow-500/80 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.15)]";
  } else if (diffState === "deleted") {
    diffContainerClass =
      "border-red-500/60 border-dashed opacity-50 bg-red-500/5 line-through decoration-red-500/40";
  }

  return (
    <div
      className={`
        relative group transition-all duration-300 animate-in fade-in zoom-in-90 duration-700
        ${selected ? "scale-105" : "hover:scale-[1.02]"}
        ${diffState === "deleted" ? "pointer-events-none" : ""}
      `}
    >
      {/* Dynamic Glow Background for Selected/Completed */}
      {selected && (
        <div className="absolute -inset-4 bg-sky-500/20 blur-2xl rounded-2xl animate-pulse pointer-events-none" />
      )}

      {/* Added / Modified AI glows */}
      {diffState === "added" && (
        <div className="absolute -inset-2 bg-green-500/10 blur-xl rounded-2xl pointer-events-none" />
      )}
      {diffState === "modified" && (
        <div className="absolute -inset-2 bg-yellow-500/10 blur-xl rounded-2xl pointer-events-none" />
      )}

      <div
        className={`
          relative w-[260px] rounded-xl border-2 p-5 overflow-hidden transition-all duration-300
          ${
            selected
              ? "bg-background border-primary shadow-2xl shadow-primary/20"
              : "bg-background/90 backdrop-blur-md border-border hover:border-muted-foreground/30 shadow-xl"
          }
          ${
            nodeData.completed && !selected
              ? "bg-teal-500/5 border-teal-500/40"
              : ""
          }
          ${diffContainerClass}
        `}
      >
        {/* Progress Strip */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${
            nodeData.completed
              ? "from-teal-500 to-emerald-400"
              : "from-sky-500 to-blue-400"
          } opacity-50`}
        />

        <Handle
          type="target"
          position={Position.Top}
          className="w-4! h-4! bg-muted! border-2! border-border! -top-2!"
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={`font-black text-base leading-tight transition-colors ${
                selected ? "text-primary" : "text-foreground"
              } ${diffState === "deleted" ? "line-through text-muted-foreground/60" : ""}`}
            >
              {nodeData.label}
              {diffState && (
                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                  diffState === "added" ? "bg-green-500/20 text-green-400" :
                  diffState === "modified" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {diffState}
                </span>
              )}
            </h3>
            {nodeData.completed && diffState !== "deleted" && (
              <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
            )}
          </div>

          <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
            {nodeData.description}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {nodeData.resources.length} Source
                {nodeData.resources.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-1.5">
              {nodeData.completed && (
                <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg text-[10px] px-2 py-0.5 animate-in fade-in zoom-in-50 font-bold uppercase tracking-wider">
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="w-4! h-4! bg-muted! border-2! border-border! -bottom-2!"
        />
      </div>

      {/* AI Icon Button on Bottom Left when selected */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("open-ai-chat", {
                detail: { id, title: nodeData.label },
              }),
            );
          }}
          className="absolute -bottom-3 -left-3 z-30 p-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border border-sky-400/20 animate-in zoom-in duration-300"
          title="Chat with AI about this topic"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export const RoadmapNode = memo(RoadmapNodeComponent);
