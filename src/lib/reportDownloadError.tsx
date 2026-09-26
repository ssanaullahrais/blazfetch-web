import { TriangleAlert } from "lucide-react";
import toast from "@/lib/toast";
import { ErrorToast } from "@/components/error-toast";
import { friendlyErrorFor, isCoolDown } from "@/lib/errors";
import { playErrorSound } from "@/lib/sound";

/** The busy alert's text, naming the kind of file when it is known. */
function alreadyDownloading(kind?: "video" | "audio"): string {
  return `Your ${kind ? `${kind} file` : "file"} is already downloading. Give it a moment, then you can start another one.`;
}

/** Shared error reporting for every download/fetch trigger: friendly toast plus optional sound. */
export function reportDownloadError(
  err: unknown,
  _sourceUrl: string | null | undefined,
  soundEnabled: boolean,
  actionLabel: "Download" | "Fetch" = "Download",
  toastId?: string,
  /** Which file the visitor asked for: a busy alert then reads "Your video file is already downloading". */
  kind?: "video" | "audio"
) {
  const rawMessage = err instanceof Error ? err.message : `${actionLabel} failed.`;
  void _sourceUrl;
  const coolDown = isCoolDown(err);
  // Being at capacity is expected, handled behaviour, not a bug: only a real failure is worth an error-level log.
  if (!coolDown) console.error(`[${actionLabel.toLowerCase()}]`, rawMessage);
  const message = coolDown ? alreadyDownloading(kind) : friendlyErrorFor(err);
  // A busy server is a short wait, not a failure: friendly wording and an orange alert instead of a red error, no error sound.
  const options = toastId ? { id: toastId } : undefined;
  if (coolDown) {
    toast(<ErrorToast title="Hang tight" message={message} calm />, {
      ...options,
      icon: <TriangleAlert className="size-5" style={{ color: "var(--toast-warning)" }} aria-hidden />,
    });
  } else {
    toast.error(<ErrorToast title={`${actionLabel} failed`} message={message} />, options);
  }
  if (soundEnabled && !coolDown) playErrorSound();
}
