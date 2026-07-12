import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { backdropClickToClose, modalPanelStopPropagation } from "@/lib/modal-backdrop"

type GlassModalOverlayProps = {
  onClose: () => void
  children: ReactNode
  className?: string
}

export function GlassModalOverlay({ onClose, children, className }: GlassModalOverlayProps) {
  return (
    <div className={cn("glass-modal-overlay", className)} onClick={backdropClickToClose(onClose)}>
      {children}
    </div>
  )
}

type GlassModalPanelProps = {
  children: ReactNode
  className?: string
}

export function GlassModalPanel({ children, className }: GlassModalPanelProps) {
  return (
    <div className={cn("glass-modal-panel", className)} {...modalPanelStopPropagation}>
      {children}
    </div>
  )
}
