import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

/** Warns that a format probably won't play on a phone, then lets the visitor decide for themselves — see
 * phoneIncompatibleFormatIds in format-order.ts. Shared so the copy stays the same everywhere it can happen. */
export function PhoneCompatDialog({
  open,
  onOpenChange,
  codec,
  onConfirmDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codec?: string | null;
  onConfirmDownload: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 rounded-2xl p-0">
        <div className="relative flex items-center border-b bg-muted/40 px-5 py-3.5 pr-14">
          <DialogTitle>May not play on your phone</DialogTitle>
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
          play. For a guaranteed result, open this page on a desktop or laptop, or pick a different quality above
          — or download it anyway and try your luck.
        </DialogDescription>
        <div className="flex flex-col gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirmDownload();
              onOpenChange(false);
            }}
          >
            Download anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
