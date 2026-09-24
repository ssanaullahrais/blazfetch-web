import { useState } from "react";
import { Check, Copy, Globe, Link2, Share2 } from "lucide-react";
import toast from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

async function shareOrCopy(url: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ url, title });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return false;
      // Fall through to clipboard copy if the native share sheet fails.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
    return true;
  } catch {
    toast.error("Couldn't copy the link.");
    return false;
  }
}

export function ShareMenu({
  shareableUrl,
  trigger,
}: {
  shareableUrl: string | null;
  /** Custom trigger content (e.g. a whole clickable menu row) in place of
   * the default icon-only button — the row itself opens the popover instead
   * of requiring a tap on just the small icon. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedVideo, setCopiedVideo] = useState(false);

  async function handleShareApp() {
    const ok = await shareOrCopy(window.location.origin, "BlazFetch");
    if (ok && !navigator.share) setCopiedApp(true);
    setTimeout(() => setCopiedApp(false), 1500);
  }

  async function handleShareVideo() {
    if (!shareableUrl) return;
    const ok = await shareOrCopy(shareableUrl, "BlazFetch");
    if (ok && !navigator.share) setCopiedVideo(true);
    setTimeout(() => setCopiedVideo(false), 1500);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" aria-label="Share">
            <Share2 className="size-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent>
        <button
          type="button"
          onClick={handleShareApp}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
        >
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Share this app</p>
            <p className="truncate text-xs text-muted-foreground">{window.location.origin}</p>
          </div>
          {copiedApp ? (
            <Check className="size-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Copy className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>

        {shareableUrl && (
          <button
            type="button"
            onClick={handleShareVideo}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
          >
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Share this video</p>
              <p className="truncate text-xs text-muted-foreground">Reopens this video for whoever you send it to</p>
            </div>
            {copiedVideo ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
