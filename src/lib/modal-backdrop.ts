import type { MouseEvent, MouseEventHandler } from "react"

/** Close only when the backdrop itself is clicked — not when clicks bubble from the panel. */
export function backdropClickToClose(onClose: () => void): MouseEventHandler<HTMLElement> {
  return (event: MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) onClose()
  }
}

/** Stop overlay from treating panel clicks as backdrop dismiss. */
export const modalPanelStopPropagation = {
  onMouseDown: (event: MouseEvent) => event.stopPropagation(),
  onClick: (event: MouseEvent) => event.stopPropagation(),
} as const
