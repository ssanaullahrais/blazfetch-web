import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

/** The one "stop this download?" confirmation, shared by the homepage's
 * format picker and every re-download CTA (Library, admin Media Library,
 * the Downloads popover) that goes through InlineDownloadButton — so a
 * behavior change here (copy, what counts as confirmed, etc.) reaches every
 * surface at once instead of drifting between two hand-copied dialogs. */
export function StopDownloadDialog({
  open,
  onOpenChange,
  sizeLabel,
  onConfirmStop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeLabel?: string;
  onConfirmStop: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 rounded-2xl p-0">
        <div className="relative flex items-center border-b bg-muted/40 px-5 py-3.5 pr-14">
          <DialogTitle>Stop this download?</DialogTitle>
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
          This will cancel it{sizeLabel ? ` (${sizeLabel})` : ""} — you'll need to start it again from scratch.
        </DialogDescription>
        <div className="flex flex-col gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep downloading
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirmStop();
              onOpenChange(false);
            }}
          >
            Stop download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
