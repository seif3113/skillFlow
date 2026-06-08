"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";

export interface RoadmapNodeData {
  label: string;
  description: string;
  resources: { title: string; url: string }[];
  completed: boolean;
}

function RoadmapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapNodeData;

  return (
    <div
      className={`
        roadmap-node px-4 py-3 rounded-xl border-2 bg-zinc-900
        min-w-[200px] max-w-[280px] cursor-pointer transition-all duration-200
        ${selected
          ? "border-sky-400 shadow-lg shadow-sky-500/20"
          : "border-zinc-700 hover:border-zinc-500"
        }
        ${nodeData.completed
          ? "bg-sky-950/50 border-sky-600"
          : ""
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3! h-3! bg-zinc-600! border-2! border-zinc-400!"
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-100 text-sm leading-tight">
          {nodeData.label}
        </h3>
        {nodeData.completed && (
          <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-xs shrink-0">
            Done
          </Badge>
        )}
      </div>

      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
        {nodeData.description}
      </p>

      {nodeData.resources.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-zinc-500">
            {nodeData.resources.length} resource{nodeData.resources.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3! h-3! bg-zinc-600! border-2! border-zinc-400!"
      />
    </div>
  );
}

export const RoadmapNode = memo(RoadmapNodeComponent);
