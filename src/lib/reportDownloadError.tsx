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
  // A busy server is a short cool-down, not a failure: friendly wording, no red, no error sound.
  const coolDown = isCoolDown(err);
  const title = coolDown ? "Hang tight" : `${actionLabel} failed`;
  toast.error(<ErrorToast title={title} message={message} calm={coolDown} />, toastId ? { id: toastId } : undefined);
  if (soundEnabled && !coolDown) playErrorSound();
}
