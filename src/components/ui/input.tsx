import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // placeholder:text-sm is deliberately smaller than the input's own
        // text-base — that base size stays 16px on mobile so focusing the
        // field doesn't trigger iOS's auto-zoom, but the placeholder itself
        // (not real content) can read smaller without that constraint.
        "h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // The browser's native number-input up/down stepper looks jarring
        // against this app's minimalist pill inputs — hidden everywhere
        // rather than restyled, since there's no cross-browser CSS way to
        // reskin it that looks better than just not having it.
        type === "number" &&
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        // The masked bullets in a password field are sized off the input's
        // own font-size — at the 16px kept everywhere else for iOS's
        // anti-zoom rule, they render noticeably big and heavy, so this
        // field alone trades that zoom-prevention for a slimmer look.
        type === "password" && "text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
