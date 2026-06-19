import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Centers page content at a comfortable reading width. Pages that need the full
// canvas width (the roadmap viewers) render their content without it.
export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl", className)}>{children}</div>
  )
}
