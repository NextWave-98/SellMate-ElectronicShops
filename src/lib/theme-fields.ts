/** Shared glass field + theme-aware focus ring (CSS vars from index.css) */
export const glassFieldBase =
  "min-w-0 rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xs transition-[color,box-shadow] outline-none dark:border-white/20 dark:bg-white/10"

export const glassFieldFocus =
  "focus-visible:border-[rgb(var(--field-accent-rgb))] focus-visible:ring-[3px] focus-visible:ring-[var(--field-focus-ring)]"

export const glassFieldInvalid =
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
