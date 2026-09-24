// The job-based download flow, used by the "With progress bar" method: POST /download starts a job on the
// server, GET /jobs/:id reports real progress, and GET /downloads/:id delivers the finished file.
import { API, request } from "@/lib/api";
import { coerceMediaUrl } from "@/lib/media-url";

/** UI-level job states. The backend's preparing/streaming map to "running",
 * ready/completed to "ready" (the file can be fetched), failed to "error". */
export type DownloadJobState = "queued" | "running" | "ready" | "error" | "cancelled";

export type DownloadJobStatus = {
  id: string;
  status: DownloadJobState;
  progress: number;
  filename: string | null;
  error: string | null;
};

type ApiJob = {
  id: string;
  status: "queued" | "preparing" | "ready" | "streaming" | "completed" | "failed" | "cancelled" | "expired";
  progress?: number;
  filename?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function toJobStatus(job: ApiJob): DownloadJobStatus {
  const status: DownloadJobState =
    job.status === "queued"
      ? "queued"
      : job.status === "preparing" || job.status === "streaming"
        ? "running"
        : job.status === "ready" || job.status === "completed"
          ? "ready"
          : job.status === "failed"
            ? "error"
            : "cancelled";
  return {
    id: job.id,
    status,
    progress: job.progress ?? 0,
    filename: job.filename ?? null,
    error: job.errorMessage ?? null,
  };
}

/** Starts a background job. `formatId` defaults to "best" on the backend. */
export async function startDownloadJob(params: { url: string; formatId?: string; kind: "video" | "audio"; quality?: string }) {
  const data = await request<{ job: ApiJob }>("/download", {
    method: "POST",
    body: JSON.stringify({
      url: coerceMediaUrl(params.url),
      formatId: params.formatId,
      kind: params.kind,
      quality: params.quality,
    }),
  });
  return toJobStatus(data.job);
}

export async function getDownloadJob(jobId: string) {
  const data = await request<{ job: ApiJob }>(`/jobs/${encodeURIComponent(jobId)}`);
  return toJobStatus(data.job);
}

/** Cancels the job, stops any running yt-dlp/ffmpeg process and removes its temp files. */
export async function cancelDownloadJob(jobId: string) {
  await request(`/downloads/${encodeURIComponent(jobId)}`, { method: "DELETE" });
}

/** Streams the finished file (one-shot: the backend removes its temp copy afterwards). */
export function requestDownloadJobFile(jobId: string) {
  return fetch(downloadJobFileUrl(jobId), { credentials: "include", cache: "no-store" });
}

export function downloadJobFileUrl(jobId: string) {
  return `${API}/downloads/${encodeURIComponent(jobId)}`;
}
