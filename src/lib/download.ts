import { downloadJobFileUrl } from "@/lib/api";

/** Hands a finished job's file to the browser's own download manager. */
export function startNativeDownload(jobId: string) {
  // Same-tab anchor: the backend sets Content-Disposition: attachment, so the
  // page stays put and the browser just saves the file.
  const anchor = document.createElement("a");
  anchor.href = downloadJobFileUrl(jobId);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
