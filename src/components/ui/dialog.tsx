import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  fullScreen = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Below `sm`, fills the entire viewport edge-to-edge like a sheet instead
   * of the normal centered/rounded modal box — opt in per dialog (Plans,
   * Network) rather than globally, since most dialogs read better as a
   * regular centered modal even on small screens. */
  fullScreen?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // overflow-hidden is load-bearing: DialogHeader/DialogFooter bleed
          // out to this element's own edges (-mx-4 -mt-4/-mb-4) to read as
          // docked bars, and without clipping their square corners poke out
          // past this box's own rounded-2xl corners.
          "fixed z-50 flex flex-col gap-4 overflow-hidden bg-popover p-4 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          fullScreen
            ? "inset-0 h-dvh w-dvw max-w-none rounded-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:grid sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6 sm:gap-6 sm:max-w-md"
            : // `width` (not `max-width`) carries the mobile edge margin here
              // deliberately — a caller's own `max-w-*` (StopDownloadDialog's
              // `max-w-sm`, etc.) sets `max-width`, a different CSS property,
              // so the two compose (computed width is the smaller of the
              // two) instead of one clobbering the other via class-merge.
              "top-1/2 left-1/2 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl sm:max-w-md",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // Mirrors DialogFooter's docked-bar treatment for a consistent
        // framed look (header bar / scrollable body / footer bar). The
        // The close button is absolutely pinned so it never changes the
        // title width or alignment.
        "relative -mx-4 -mt-4 flex items-center justify-center gap-3 border-b bg-muted/40 p-4",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-8 text-center sm:items-start sm:px-0 sm:pr-10 sm:text-left">{children}</div>
      <DialogPrimitive.Close data-slot="dialog-close" asChild>
        <Button
          variant="ghost"
          className="absolute top-1/2 right-4 shrink-0 -translate-y-1/2 bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground sm:bg-secondary sm:text-foreground"
          size="icon-sm"
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </Button>
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Bleeds out to DialogContent's own edges (-mx-4 -mb-4 cancels its
        // p-4) and gets its own tinted background + top border, so a footer
        // reads as a docked bar in both themes instead of blending into the
        // dialog body — bg-muted/border already flip correctly for dark
        // mode via their CSS variables. DialogContent's own overflow-hidden
        // + rounded corners clips this back to the correct bottom corners.
        "-mx-4 -mb-4 flex flex-row items-center justify-center gap-2 border-t bg-muted/40 p-4 sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
