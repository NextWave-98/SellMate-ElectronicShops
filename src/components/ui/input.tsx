import * as React from "react"

import { cn } from "@/lib/utils"
import { glassFieldBase, glassFieldFocus, glassFieldInvalid } from "@/lib/theme-fields"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full px-3 py-1 text-base selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        glassFieldBase,
        glassFieldFocus,
        glassFieldInvalid,
        className
      )}
      {...props}
    />
  )
}

export { Input }
