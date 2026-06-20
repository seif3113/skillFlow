"use client";

import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "strokeWidth">): React.ReactElement {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      data-slot="spinner"
      icon={Loading03Icon}
      role="status"
      strokeWidth={2}
      {...props}
    />
  );
}
