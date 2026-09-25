import { AlertTriangle, Check, CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DownloadCTAState = "idle" | "starting" | "queued" | "preparing" | "ready" | "done" | "failed";

/** The one download-progress CTA visual, used everywhere a download can be
 * in flight — the homepage's own format picker (FormatRow), the Library/
 * dashboard's InlineDownloadButton, and the live in-flight ActiveDownloadCard
 * (Library "in progress", admin Media Library, the homepage's Downloads
 * popover). Extracted from the homepage's original FormatRow button so
 * every surface stays pixel-identical instead of three separate
 * reimplementations quietly drifting apart: dark pill + spinner while
 * preparing, emerald once done, the default button look otherwise.
 *
 * `progress` fills the pill and shows a percentage while preparing. It's real
 * (from the server's own extraction progress) for the Compatible delivery
 * method; for Automatic/Fastest, which hand the transfer straight to the
 * browser's download manager and never see a byte count, the caller paces it
 * with a simulated, ever-slowing climb instead of leaving it indeterminate —
 * see simulateProgress in home-page.tsx. Omit it (or pass null) for a plain
 * spinner with no fill, e.g. a state that genuinely has no signal at all yet. */
export function DownloadProgressButton({
  state,
  progress,
  onClick,
  disabled,
  size = "sm",
  className = "",
  idleLabel = "Download",
  queuedLabel = "Queued",
  readyLabel = "Start",
  doneLabel = "Saved",
  failedLabel = "Failed",
  sizeLabel,
}: {
  state: DownloadCTAState;
  /** 0–100 while `state === "preparing"`. See the component doc comment above. */
  progress?: number | null;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  idleLabel?: string;
  /** Shown while `state === "queued"` — waiting for a concurrency slot on
   * the server, nothing has actually started yet. Clicking it again removes
   * it from the queue outright (no confirmation), unlike stopping an
   * already-running download. */
  queuedLabel?: string;
  /** Shown while `state === "ready"` — e.g. "Saving…" for a card that's
   * about to auto-fetch the file itself, vs. the default "Ready" for one
   * that's waiting on an explicit click. */
  readyLabel?: string;
  doneLabel?: string;
  /** Shown while `state === "failed"` — the job errored out or was
   * cancelled server-side. Terminal, same as "done": nothing left to click
   * for by default, just a dismissible record of what happened. */
  failedLabel?: string;
  /** Appended after the label on narrow screens only, same as the format
   * picker's own file-size hint next to "Download". */
  sizeLabel?: string;
}) {
  const isDone = state === "done";
  const isStarting = state === "starting";
  const isReady = state === "ready";
  const isPreparing = state === "preparing";
  const isQueued = state === "queued";
  const isFailed = state === "failed";
  const inProgress = isStarting || isPreparing;
  const knownProgress = isPreparing && typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  return (
    <Button
      size={size}
      variant={inProgress || isReady || isDone || isQueued || isFailed ? undefined : "secondary"}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden text-xs ${
        isReady
          ? "bg-sky-600 text-white ring-1 ring-sky-400/40 hover:bg-sky-500"
          : inProgress
          ? "bg-neutral-800 text-white hover:bg-neutral-700"
          : isQueued
            ? "bg-muted text-muted-foreground hover:bg-muted/70"
            : isFailed
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : isDone
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "hover:bg-primary hover:text-primary-foreground"
      } ${className}`}
    >
      {knownProgress !== null && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300 ease-out"
          style={{ width: `${knownProgress}%` }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {isDone ? (
          <Check className="size-4 shrink-0" />
        ) : isFailed ? (
          <AlertTriangle className="size-4 shrink-0" />
        ) : isReady ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : isStarting || isPreparing ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : isQueued ? (
          <Clock className="size-4 shrink-0" />
        ) : (
          <Download className="size-4 shrink-0" />
        )}
        <span>
          {isDone
            ? doneLabel
            : isFailed
              ? failedLabel
              : isReady
                ? readyLabel
                : isStarting
                  ? "Starting…"
                : isPreparing
                  ? knownProgress !== null
                    ? `Preparing… ${knownProgress}%`
                    : "Preparing…"
                  : isQueued
                    ? queuedLabel
                    : idleLabel}
          {sizeLabel && !isDone && !isQueued && !isFailed && <span className="font-normal opacity-75 sm:hidden"> · {sizeLabel}</span>}
        </span>
      </span>
    </Button>
  );
}
