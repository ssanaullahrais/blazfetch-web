import { motion } from "motion/react";
import { EyeOff, ExternalLink, Loader2, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { detectPlatformLabel, type Tombstone } from "@/lib/api";
import { safeHref } from "@/lib/safe-url";

function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/** Why it is gone, in plain words. The backend reports the source's own answer as the reason code. */
function reasonText(reason: string | null | undefined): string {
  if (reason === "PRIVATE_MEDIA") return "The owner made it private.";
  if (reason === "MEDIA_NOT_FOUND") return "It was deleted or removed.";
  return "It was removed or made private.";
}

/**
 * Shown when the backend answers 410 MEDIA_UNAVAILABLE: this video was seen before, but a recheck found
 * it gone. The backend keeps what it knew (title, thumbnail), so the page can still say what it was.
 */
export function UnavailableCard({
  tombstone,
  onRetry,
  retrying,
}: {
  tombstone: Tombstone;
  onRetry: () => void;
  retrying: boolean;
}) {
  const since = formatDay(tombstone.unavailableSince);
  const lastSeen = formatDay(tombstone.lastSeenAvailable);
  const platform = detectPlatformLabel(tombstone.sourceUrl);
  const sourceHref = safeHref(tombstone.sourceUrl);

  return (
    <motion.div
      key="unavailable"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-xl"
    >
      <Card className="card-texture overflow-hidden rounded-md border-0 p-0 shadow-xs">
        <div className="relative z-10 flex flex-col gap-3 p-4 sm:flex-row sm:gap-4">
          {tombstone.thumbnail ? (
            <img
              src={tombstone.thumbnail}
              alt=""
              className="h-40 w-full shrink-0 rounded-md object-cover opacity-50 grayscale sm:h-24 sm:w-40"
            />
          ) : (
            <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-md bg-muted sm:h-24 sm:w-40">
              <Video className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-col justify-start gap-1.5">
            <Badge variant="outline" className="w-fit gap-1 border-destructive/40 text-destructive">
              <EyeOff className="size-3" />
              No longer available
            </Badge>
            {tombstone.title && <p className="line-clamp-2 text-sm font-medium">{tombstone.title}</p>}
            <p className="text-xs text-muted-foreground">
              {reasonText(tombstone.reason)}
              {since ? ` Gone since ${since}.` : ""}
              {lastSeen ? ` Last seen ${lastSeen}.` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground" disabled={retrying} onClick={onRetry}>
                {retrying ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                Check again
              </Button>
              {sourceHref && (
                <Button variant="ghost" size="sm" asChild className="h-6 w-fit gap-1 px-2 text-xs text-muted-foreground">
                  <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                    Open on {platform}
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
