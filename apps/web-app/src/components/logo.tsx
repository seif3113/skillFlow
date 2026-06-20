import { cn } from "@/lib/utils"

// SkillFlow brand logo, served from public/logo.svg. Sized via className
// (height + auto width preserves the source aspect ratio).
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="SkillFlow"
      className={cn("h-8 w-auto select-none", className)}
    />
  )
}

// Icon-sized rendering of the same mark (e.g. collapsed sidebar). `shrink-0` +
// `object-contain` keep its aspect ratio when the sidebar collapses the button.
export function LogoIcon({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="SkillFlow"
      className={cn("h-7 w-auto shrink-0 select-none object-contain", className)}
    />
  )
}
