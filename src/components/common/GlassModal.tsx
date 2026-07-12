import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

export interface GlassModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** e.g. max-w-4xl — overrides default sm:max-w-lg */
  maxWidth?: string
  className?: string
  panelClassName?: string
  closeOnBackdrop?: boolean
}

/**
 * Glass-styled modal built on shadcn Dialog (backdrop click + escape handled by Radix).
 */
export default function GlassModal({
  open,
  onClose,
  children,
  maxWidth = "max-w-lg",
  panelClassName,
  closeOnBackdrop = true,
}: GlassModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && closeOnBackdrop) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(90vh,100dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          maxWidth,
          panelClassName
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
