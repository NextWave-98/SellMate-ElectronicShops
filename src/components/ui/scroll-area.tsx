import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Frosted glass thumb   use in modals and glass panels */
  glass?: boolean
}

function ScrollArea({
  className,
  glass = false,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-glass={glass ? "" : undefined}
      className={cn("relative", glass && "min-h-0 flex-1", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          glass && "[&>div]:!block"
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar glass={glass} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  glass = false,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
  glass?: boolean
}) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        glass && "p-0.5",
        orientation === "vertical" &&
          (glass
            ? "h-full w-2 border-l border-l-[rgba(var(--modal-scroll-border),0.35)]"
            : "h-full w-2.5 border-l border-l-transparent p-px"),
        orientation === "horizontal" &&
          (glass
            ? "h-2 flex-col border-t border-white/10"
            : "h-2.5 flex-col border-t border-t-transparent p-px"),
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-full transition-colors",
          glass ? "modal-glass-scroll-thumb" : "bg-border"
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
