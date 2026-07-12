import * as React from "react"

import { cn } from "@/lib/utils"
import { glassFieldBase, glassFieldFocus, glassFieldInvalid } from "@/lib/theme-fields"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-16 w-full px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        glassFieldBase,
        glassFieldFocus,
        glassFieldInvalid,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
