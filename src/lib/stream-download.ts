import { API_BASE, getDownloadFilename } from "@/lib/api";
import { ApiError, apiErrorFromBody, parseErrorFromText } from "@/lib/errors";
import { coerceMediaUrl } from "@/lib/media-url";
import { markPassLost, waitForPass } from "@/lib/turnstile";
import { notifyStatsChanged } from "@/lib/stats-events";

/**
 * How the backend delivers a file (GET /api/v1/stream?mode=...):
 * - `auto`: stream straight through, and if that can't work for a source, prepare the file on the server.
 * - `stream`: stream only. Fastest, but a few sources can't be streamed and fail.
 * - `prepare`: build a compatible H.264/AAC file on the server first. Slower start, plays everywhere.
 */
export type DeliveryMode = "auto" | "stream" | "prepare";

export type StreamParams = {
  url: string;
  kind: "video" | "audio";
  /** Omit for the best quality. */
  formatId?: string;
  /** File name without extension; the server adds the right one. */
  filename?: string;
  mode?: DeliveryMode;
};

/** The one-request download URL. It is a plain GET, so a browser can start it by navigating to it. */
export function buildStreamUrl(params: StreamParams, token?: string): string {
  const query = new URLSearchParams();
  query.set("url", coerceMediaUrl(params.url));
  query.set("kind", params.kind);
  if (params.formatId) query.set("formatId", params.formatId);
  if (params.filename) query.set("filename", params.filename.slice(0, 200));
  query.set("mode", params.mode ?? "auto");
  if (token) query.set("token", token);
  return `${API_BASE}/api/v1/stream?${query.toString()}`;
}

/** A random id for one download. The backend echoes it back as the cookie `blazfetch_dl_<token>` once bytes flow. */
export function newDownloadToken(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const START_COOKIE_PREFIX = "blazfetch_dl_";

// ---- Starting a download in the browser --------------------------------------------------------

export interface FrameHandle {
  onLoad(callback: () => void): void;
  /** The text of the page the frame ended up on, or null when it can't be read. */
  bodyText(): string | null;
  remove(): void;
}

/** The browser pieces the download watcher needs, so it can be tested without a browser. */
export interface DownloadEnv {
  hasCookie(name: string): boolean;
  clearCookie(name: string): void;
  createFrame(url: string): FrameHandle;
  /** Same origin as the API: the page can then read the start cookie and the frame's content. */
  observable: boolean;
  /** Plain navigation, used when the API is on another origin and can't be observed. */
  navigate(url: string): void;
}

function browserEnv(): DownloadEnv {
  const apiOrigin = API_BASE ? new URL(API_BASE, window.location.href).origin : window.location.origin;
  return {
    observable: apiOrigin === window.location.origin,
    hasCookie: (name) => document.cookie.split("; ").some((c) => c.startsWith(`${name}=`)),
    clearCookie: (name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    },
    createFrame: (url) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");
      iframe.tabIndex = -1;
      document.body.appendChild(iframe);
      iframe.src = url;
      return {
        onLoad: (callback) => iframe.addEventListener("load", callback),
        bodyText: () => {
          try {
            return iframe.contentDocument?.documentElement?.textContent ?? null;
          } catch {
            return null;
          }
        },
        remove: () => {
          iframe.src = "about:blank";
          iframe.remove();
        },
      };
    },
    navigate: (url) => {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    },
  };
}

export type StartOptions = {
  signal?: AbortSignal;
  env?: DownloadEnv;
  pollMs?: number;
  /** Give up waiting for the download to start after this long (a server-side prepare can take minutes). */
  maxWaitMs?: number;
};

const FRAME_LINGER_MS = 60_000;

/**
 * Hands a download to the browser's own download manager by navigating a hidden frame to the stream URL,
 * and resolves once the file really starts arriving. No bytes pass through the page, so file size doesn't
 * matter and nothing is buffered in memory.
 *
 * - Success is detected by the cookie the backend sets when bytes start flowing (`?token=`).
 * - A failure before the first byte comes back as a JSON error, which lands in the frame and is read
 *   from there, so the page can show the real reason and stay where it is.
 * - Aborting the signal removes the frame, which cancels the request; the server then stops its work.
 * - If the API is on another origin the page can't see either signal, so the download is simply handed
 *   over (same-origin deployment is recommended, see docs/DEPLOYMENT.md).
 */
function startBrowserDownloadNow(params: StreamParams, options: StartOptions = {}): Promise<void> {
  const env = options.env ?? browserEnv();
  const { signal, pollMs = 200, maxWaitMs = 12 * 60_000 } = options;

  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));

  const token = newDownloadToken();
  const url = buildStreamUrl(params, token);

  if (!env.observable) {
    env.navigate(url);
    return Promise.resolve();
  }

  const cookieName = `${START_COOKIE_PREFIX}${token}`;

  return new Promise<void>((resolve, reject) => {
    const frame = env.createFrame(url);
    let settled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (action: () => void, keepFrame = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(pollTimer);
      clearTimeout(maxTimer);
      signal?.removeEventListener("abort", onAbort);
      if (keepFrame) setTimeout(() => frame.remove(), FRAME_LINGER_MS);
      else frame.remove();
      action();
    };

    const onAbort = () => settle(() => reject(new DOMException("Aborted", "AbortError")));

    const poll = () => {
      if (settled) return;
      if (env.hasCookie(cookieName)) {
        env.clearCookie(cookieName);
        settle(resolve, true);
        return;
      }
      pollTimer = setTimeout(poll, pollMs);
    };

    frame.onLoad(() => {
      const text = frame.bodyText();
      const failure = text ? parseErrorFromText(text) : null;
      if (failure) settle(() => reject(new ApiError(failure.code, failure.message)));
    });

    signal?.addEventListener("abort", onAbort, { once: true });
    maxTimer = setTimeout(
      () => settle(() => reject(new ApiError("PROCESS_TIMEOUT", "The download took too long to start."))),
      maxWaitMs
    );
    poll();
  });
}

// ---- Fetching a small file into memory (audio preview) -------------------------------------------

export type StreamedBlob = { blob: Blob; filename: string; mode: string | null };

/**
 * Downloads a stream into memory so it can be played or saved without a second request. Meant for small
 * files (audio); large videos go through startBrowserDownload instead so they never sit in memory.
 */
export async function fetchStreamBlob(
  params: StreamParams,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void; fallbackName: string }
): Promise<StreamedBlob> {
  await waitForPass();
  let res: Response;
  try {
    res = await fetch(buildStreamUrl(params), { credentials: "include", cache: "no-store", signal: options.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("NETWORK_ERROR", "Failed to fetch");
  }
  if (!res.ok) throw apiErrorFromBody(await res.json().catch(() => null), res.status);

  const filename = getDownloadFilename(res.headers.get("Content-Disposition"), options.fallbackName);
  const total = Number(res.headers.get("Content-Length")) || 0;
  const chunks: Uint8Array[] = [];
  let received = 0;

  const reader = res.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      // With a known size the bar is exact; otherwise ease towards 95% as bytes arrive.
      const percent = total > 0 ? (received / total) * 99 : 95 * (1 - Math.exp(-received / 3_000_000));
      options.onProgress?.(Math.min(99, Math.round(percent)));
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") ?? undefined });
  return { blob, filename, mode: res.headers.get("X-Blazfetch-Mode") };
}

/** Saves an in-memory file through the browser (an audio file that was already downloaded for preview). */
export function saveBlobToDisk(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

/** Starts a download, first waiting for the optional Turnstile check and retrying once if the pass had lapsed. */
export async function startBrowserDownload(params: StreamParams, options: StartOptions = {}): Promise<void> {
  if (options.env) return startBrowserDownloadNow(params, options); // tests drive the browser stand-in directly
  await waitForPass();
  try {
    const started = await startBrowserDownloadNow(params, options);
    notifyStatsChanged();
    return started;
  } catch (err) {
    if (err instanceof ApiError && err.code === "TURNSTILE_REQUIRED") {
      markPassLost();
      await waitForPass();
      return startBrowserDownloadNow(params, options);
    }
    throw err;
  }
}
