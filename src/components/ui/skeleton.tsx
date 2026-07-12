import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-white/40 backdrop-blur-sm border border-white/20", className)}
      {...props}
    />
  )
}

export { Skeleton }
