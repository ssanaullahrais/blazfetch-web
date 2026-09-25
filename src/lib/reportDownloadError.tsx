import { TriangleAlert } from "lucide-react";
import toast from "@/lib/toast";
import { ErrorToast } from "@/components/error-toast";
import { friendlyErrorFor, isCoolDown } from "@/lib/errors";
import { playErrorSound } from "@/lib/sound";

/** Shared error reporting for every download/fetch trigger: friendly toast plus optional sound. */
export function reportDownloadError(
  err: unknown,
  _sourceUrl: string | null | undefined,
  soundEnabled: boolean,
  actionLabel: "Download" | "Fetch" = "Download",
  toastId?: string
) {
  const rawMessage = err instanceof Error ? err.message : `${actionLabel} failed.`;
  console.error(`[${actionLabel.toLowerCase()}]`, rawMessage);
  void _sourceUrl;
  const message = friendlyErrorFor(err);
  // A busy server is a short wait, not a failure: friendly wording and an orange alert instead of a red error, no error sound.
  const coolDown = isCoolDown(err);
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
