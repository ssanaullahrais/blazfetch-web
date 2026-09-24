import toast from "@/lib/toast";
import { ErrorToast } from "@/components/error-toast";
import { friendlyError } from "@/lib/api";
import { playErrorSound } from "@/lib/sound";

/** Shared error reporting for every download/fetch trigger: friendly toast plus optional sound. */
export function reportDownloadError(
  err: unknown,
  sourceUrl: string | null | undefined,
  soundEnabled: boolean,
  actionLabel: "Download" | "Fetch" = "Download",
  toastId?: string
) {
  const rawMessage = err instanceof Error ? err.message : `${actionLabel} failed.`;
  console.error(`[${actionLabel.toLowerCase()}]`, rawMessage);
  const message = friendlyError(rawMessage, sourceUrl);
  toast.error(<ErrorToast title={`${actionLabel} failed`} message={message} />, toastId ? { id: toastId } : undefined);
  if (soundEnabled) playErrorSound();
}
