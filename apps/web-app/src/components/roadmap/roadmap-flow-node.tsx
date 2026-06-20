import { Handle, Position, type NodeProps } from "@xyflow/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  BookOpen01Icon,
  CircleLock01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { asResources, type RoadmapFlowNode } from "@/lib/roadmap-graph"

// Custom xyflow node card for a roadmap topic. Handles (top/bottom) let the
// prerequisite edges attach. Completed nodes get a success ring + check.
export function RoadmapFlowNodeCard({
  data,
  selected,
}: NodeProps<RoadmapFlowNode>) {
  const { node, status } = data
  const resourceCount = asResources(node.resources).length

  return (
    <div
      className={cn(
        "w-[260px] rounded-2xl border bg-card px-4 py-3 text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-colors",
        selected && "border-primary ring-primary/30",
        status === "available" && "ring-primary/25",
        status === "completed" && "border-primary/40 bg-primary/5",
        status === "locked" && "opacity-60"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-0 !bg-muted-foreground/40"
      />
      <div className="flex items-start gap-2">
        {status === "completed" ? (
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
        ) : status === "locked" ? (
          <HugeiconsIcon
            icon={CircleLock01Icon}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{node.title}</p>
          {node.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {node.description}
            </p>
          ) : null}
        </div>
      </div>
      {resourceCount > 0 ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />
          {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-0 !bg-muted-foreground/40"
      />
    </div>
  )
}
