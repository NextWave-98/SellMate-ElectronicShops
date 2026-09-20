/** Shared glassmorphism class tokens for modals, cards, tables, and overlays */

/** Frosted backdrop   soft gradient, not flat gray */
export const glassOverlay =
  "glass-modal-overlay"

export const glassPanel =
  "rounded-2xl border border-white/40 bg-white/55 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_60px_0_rgba(15,23,42,0.2)] ring-1 ring-inset ring-white/50"

/** Layout helper   use with GlassModalScroll component for custom scrollbar */
export const glassModalScroll = "glass-modal-scroll min-h-0 flex-1"

/** Layout-only header   no separate background (glass lives on panel parent) */
export const glassPanelHeader =
  "sticky top-0 z-10 shrink-0 bg-transparent px-6 pt-6 pb-4"

/** Layout-only footer   no separate background (glass lives on panel parent) */
export const glassPanelFooter =
  "sticky bottom-0 z-10 shrink-0 bg-transparent px-6 pt-4 pb-6"

export const glassCard =
  "rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm shadow-sm"

export const glassCardHover =
  "rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm hover:bg-white/50 transition-colors"

export const glassTableWrap =
  "overflow-hidden rounded-2xl border border-white/30 bg-white/40 backdrop-blur-sm shadow-sm"

export const glassTableHeader =
  "bg-white/30 backdrop-blur-sm border-b border-white/20"

export const glassInput =
  "min-w-0 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[rgb(var(--field-accent-rgb))] focus-visible:ring-[3px] focus-visible:ring-[var(--field-focus-ring)] dark:border-white/20 dark:bg-white/10"
