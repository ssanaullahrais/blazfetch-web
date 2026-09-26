import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

/** Explains why a format's Download button was swapped for "Use Desktop" — see isPhoneIncompatible in
 * format-order.ts. Shared so the copy stays the same everywhere it can happen. */
export function PhoneCompatDialog({
  open,
  onOpenChange,
  codec,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codec?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 rounded-2xl p-0">
        <div className="relative flex items-center border-b bg-muted/40 px-5 py-3.5 pr-14">
          <DialogTitle>Not available on phones</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-secondary text-foreground active:not-aria-[haspopup]:-translate-y-1/2"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="px-5 py-5 leading-6">
          This quality uses a video format{codec ? ` (${codec})` : ""} that most phones and mobile browsers can't
          play. Open this page on a desktop or laptop to download it, or pick a different quality above.
        </DialogDescription>
        <div className="flex justify-end border-t bg-muted/40 px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
