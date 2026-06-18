"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, BookOpen } from "lucide-react";

export interface RoadmapNodeData {
  label: string;
  description: string;
  resources: { title: string; url: string }[];
  completed: boolean;
  isReadOnly?: boolean;
}

function RoadmapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapNodeData;

  return (
    <div
      className={`
        relative group transition-all duration-300
        ${selected ? "scale-105" : "hover:scale-[1.02]"}
      `}
    >
      {/* Dynamic Glow Background for Selected/Completed */}
      {selected && (
        <div className="absolute -inset-4 bg-sky-500/20 blur-2xl rounded-2xl animate-pulse pointer-events-none" />
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
              }`}
            >
              {nodeData.label}
            </h3>
            {nodeData.completed && (
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
              {selected && !nodeData.isReadOnly && (
                <Badge className="bg-primary text-primary-foreground border-none rounded-lg text-[10px] px-2 py-0.5 animate-in fade-in zoom-in-50">
                  Editing
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
    </div>
  );
}

export const RoadmapNode = memo(RoadmapNodeComponent);
