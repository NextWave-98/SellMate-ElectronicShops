import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

type GlassModalScrollProps = {
  children: ReactNode
  className?: string
  /** Inner wrapper classes (padding, spacing) */
  contentClassName?: string
}

/**
 * Custom vertical scroll for modals — Radix ScrollArea with glass thumb (no native scrollbar).
 */
function GlassModalScroll({
  children,
  className,
  contentClassName,
}: GlassModalScrollProps) {
  return (
    <ScrollArea glass className={cn("min-h-0 flex-1", className)}>
      <div className={cn("px-6 py-6", contentClassName)}>{children}</div>
    </ScrollArea>
  )
}

export { GlassModalScroll }
