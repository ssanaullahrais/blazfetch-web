import { getDownloadJob, type DownloadJobStatus } from "@/lib/jobs";

const TERMINAL = new Set<DownloadJobStatus["status"]>(["ready", "error", "cancelled"]);
const POLL_MS = 1_000;

/** Polls GET /jobs/:id until the job is ready to download (or failed/cancelled).
 * A few consecutive network errors abort the wait instead of spinning forever;
 * terminal backend errors are returned unchanged so the caller can show the reason. */
export function waitForDownloadJob(
  jobId: string,
  options: {
    signal?: AbortSignal;
    onUpdate?: (job: DownloadJobStatus) => void;
    onAbort?: () => void | Promise<void>;
  } = {}
) {
  return new Promise<DownloadJobStatus>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const poll = async () => {
      if (settled) return;
      try {
        const job = await getDownloadJob(jobId);
        consecutiveErrors = 0;
        if (settled) return;
        options.onUpdate?.(job);
        if (TERMINAL.has(job.status)) {
          settled = true;
          cleanup();
          resolve(job);
          return;
        }
      } catch (error) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) {
          fail(error instanceof Error ? error : new Error("Lost connection to the download server."));
          return;
        }
      }
      timer = setTimeout(poll, POLL_MS);
    };
    const abort = () => {
      Promise.resolve(options.onAbort?.())
        .then(() => fail(new DOMException("Aborted", "AbortError")))
        .catch(fail);
    };

    if (options.signal?.aborted) {
      abort();
      return;
    }
    options.signal?.addEventListener("abort", abort, { once: true });
    void poll();
  });
}
