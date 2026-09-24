// Client for the Blazfetch backend (see backend/docs/API.md). Relative by
// default: requests go through the Vite dev proxy locally (vite.config.ts)
// and a single reverse proxy in production. Set VITE_API_BASE only when the
// API lives on a different origin (the backend's CORS_ALLOWED_ORIGINS must
// then include this site).
import { coerceMediaUrl } from "@/lib/media-url";

export const API_BASE = import.meta.env.VITE_API_BASE || "";
const API = `${API_BASE}/api/v1`;

/** A backend error envelope: { success: false, error: { code, message } }. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      credentials: "include",
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Failed to fetch");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new ApiError(data?.error?.code ?? "UNKNOWN", data?.error?.message ?? "Request failed.", res.status);
  }
  return data as T;
}

// ---- Backend response shapes -------------------------------------------------

type ApiFormat = {
  formatId: string;
  ext: string;
  kind: "video" | "audio" | "video_only" | "audio_only";
  quality?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  codec?: string;
  filesizeBytes?: number;
  filesizeApprox?: boolean;
  url?: string;
  requiresMerge?: boolean;
  compatible?: boolean;
};

type ApiAudioFormat = {
  formatId: string;
  ext: string;
  bitrate?: number;
  codec?: string;
  quality?: string;
  filesizeBytes?: number;
  filesizeApprox?: boolean;
  isConverted: boolean;
};

type ApiItem = {
  id: string;
  type: "image" | "video";
  thumbnail?: string;
  source?: string;
  durationSeconds?: number;
  formats?: ApiFormat[];
};

type ApiFetchResponse = {
  platform: string;
  mediaType: "video" | "audio" | "image" | "carousel" | "playlist";
  mediaId: string;
  canonicalUrl: string;
  title?: string;
  author?: { name?: string; url?: string };
  thumbnail?: string;
  durationSeconds?: number | null;
  items?: ApiItem[];
  formats: ApiFormat[];
  audioFormats: ApiAudioFormat[];
  playlist?: {
    title?: string;
    items: { videoId: string; title: string; thumbnail?: string; durationSeconds?: number; url: string }[];
  };
  extractor: string;
  metadata?: Record<string, unknown>;
};

type ApiAudioResponse = { audioFormats: ApiAudioFormat[] };

export type Platform = { id: string; label: string; domains: string[] };

// ---- UI-facing media model ---------------------------------------------------

export type MediaFormat = {
  format_id: string;
  ext: string;
  resolution: string | null;
  height: number | null;
  fps: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  note: string | null;
  filesize: number | null;
  filesizeApprox: boolean;
  abr: number | null;
  tbr: number | null;
  vcodec?: string | null;
  acodec?: string | null;
};

export type PlaylistEntry = {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
};

export type ImageItem = {
  url: string;
  thumbnail: string;
  filesize: number | null;
  ext?: string;
};

export type CarouselVideoItem = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  /** formatId to pass to POST /download together with the post URL. */
  formatId: string;
  ext: string;
  filesize: number | null;
};

export type MediaInfo = {
  id: string | null;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  /** Backend platform id, e.g. "youtube", "twitter". */
  extractor: string;
  webpage_url: string;
  videoFormats: MediaFormat[];
  audioFormats: MediaFormat[];
  /** "video" (default when absent) | "playlist" | "images" | "carousel" */
  type?: "video" | "playlist" | "images" | "carousel";
  entries?: PlaylistEntry[];
  images?: ImageItem[];
  /** "carousel" only: videos from a multi-item post. `images` may hold the photos of a mixed post. */
  carouselVideos?: CarouselVideoItem[];
  /** Large collections (Pinterest boards): which slice is loaded out of the total. */
  range?: { total: number; start: number; end: number; truncated: boolean; max: number };
};

export type FetchOptions = { forceRefresh?: boolean; rangeStart?: number; rangeEnd?: number };

function toVideoFormat(f: ApiFormat): MediaFormat {
  return {
    format_id: f.formatId,
    ext: f.ext,
    resolution: f.height ? `${f.height}p` : (f.quality ?? null),
    height: f.height ?? null,
    fps: f.fps ?? null,
    hasVideo: true,
    hasAudio: f.kind === "video",
    note: f.compatible === false ? "may need transcoding" : null,
    filesize: f.filesizeBytes ?? null,
    filesizeApprox: !!f.filesizeApprox,
    abr: null,
    tbr: f.bitrate ?? null,
    vcodec: f.codec ?? null,
    acodec: null,
  };
}

function toAudioFormat(f: ApiAudioFormat): MediaFormat {
  return {
    format_id: f.formatId,
    ext: f.ext,
    resolution: null,
    height: null,
    fps: null,
    hasVideo: false,
    hasAudio: true,
    note: f.isConverted ? "converted to MP3" : (f.quality ?? null),
    filesize: f.filesizeBytes ?? null,
    filesizeApprox: !!f.filesizeApprox,
    abr: f.bitrate ?? null,
    tbr: null,
    vcodec: null,
    acodec: f.codec ?? null,
  };
}

/** Highest resolution first; one row per resolution+container, preferring browser-compatible ones. */
function dedupeVideoFormats(formats: ApiFormat[]): MediaFormat[] {
  const sorted = [...formats].sort(
    (a, b) => (b.height ?? 0) - (a.height ?? 0) || Number(b.compatible) - Number(a.compatible) || (b.fps ?? 0) - (a.fps ?? 0)
  );
  const seen = new Set<string>();
  const out: MediaFormat[] = [];
  for (const f of sorted) {
    const key = `${f.height ?? f.quality ?? f.formatId}:${f.ext}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toVideoFormat(f));
  }
  return out;
}

/** Audio options come from POST /fetch/audio (it adds the MP3-conversion option when a source has no audio track). */
async function fetchAudioFormats(url: string): Promise<ApiAudioFormat[] | null> {
  try {
    const data = await request<ApiAudioResponse>("/fetch/audio", { method: "POST", body: JSON.stringify({ url }) });
    return data.audioFormats;
  } catch {
    return null;
  }
}

export async function fetchInfo(url: string, options: FetchOptions = {}): Promise<MediaInfo> {
  const cleanUrl = coerceMediaUrl(url);
  const data = await request<ApiFetchResponse>("/fetch", {
    method: "POST",
    body: JSON.stringify({ url: cleanUrl, ...options }),
  });

  const base = {
    id: data.mediaId ?? null,
    title: data.title ?? data.playlist?.title ?? "Untitled",
    thumbnail: data.thumbnail ?? null,
    duration: data.durationSeconds ?? null,
    uploader: data.author?.name ?? null,
    extractor: data.platform,
    webpage_url: data.canonicalUrl,
    videoFormats: [] as MediaFormat[],
    audioFormats: [] as MediaFormat[],
  };

  if (data.mediaType === "playlist" && data.playlist) {
    return {
      ...base,
      type: "playlist",
      entries: data.playlist.items.map((it) => ({
        id: it.videoId,
        title: it.title,
        url: it.url,
        thumbnail: it.thumbnail ?? null,
        duration: it.durationSeconds ?? null,
        uploader: null,
      })),
    };
  }

  if (data.mediaType === "carousel" && data.items) {
    const images: ImageItem[] = [];
    const carouselVideos: CarouselVideoItem[] = [];
    data.items.forEach((item, index) => {
      if (item.type === "image" && item.source) {
        images.push({ url: item.source, thumbnail: item.thumbnail ?? item.source, filesize: null });
      } else if (item.type === "video" && item.formats?.length) {
        const best = [...item.formats].sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
        carouselVideos.push({
          id: item.id,
          title: `Video ${index + 1}`,
          thumbnail: item.thumbnail ?? null,
          duration: item.durationSeconds ?? null,
          uploader: null,
          formatId: best.formatId,
          ext: best.ext,
          filesize: best.filesizeBytes ?? null,
        });
      }
    });
    const meta = data.metadata ?? {};
    const total = Number(meta.totalPinCount);
    return {
      ...base,
      type: carouselVideos.length === 0 ? "images" : "carousel",
      images,
      carouselVideos,
      range: total
        ? {
            total,
            start: Number(meta.rangeStart) || 1,
            end: Number(meta.rangeEnd) || data.items.length,
            truncated: !!meta.truncated,
            max: Number(meta.maxItemsPerRequest) || 200,
          }
        : undefined,
    };
  }

  if (data.mediaType === "image") {
    const src = data.formats[0]?.url ?? data.thumbnail;
    return { ...base, type: "images", images: src ? [{ url: src, thumbnail: data.thumbnail ?? src, filesize: null }] : [] };
  }

  const videoFormats = dedupeVideoFormats(data.formats);
  const rawAudio = (await fetchAudioFormats(cleanUrl)) ?? data.audioFormats;
  // Drop HLS/manifest entries (no bitrate) and DRC variants, best bitrate first;
  // keep converted (MP3-from-video) options as they are.
  const usableAudio = rawAudio.filter((f) => f.isConverted || (f.bitrate && !/drc/i.test(f.quality ?? f.formatId)));
  const audioFormats = (usableAudio.length ? usableAudio : rawAudio)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
    .map(toAudioFormat);
  return { ...base, type: "video", videoFormats, audioFormats };
}

let platformsPromise: Promise<Platform[]> | null = null;
/** Supported platforms as reported by the backend (cached for the session). */
export function getPlatforms(): Promise<Platform[]> {
  platformsPromise ??= request<{ platforms: Platform[] }>("/platforms")
    .then((d) => d.platforms)
    .catch((err) => {
      platformsPromise = null;
      throw err;
    });
  return platformsPromise;
}

export type BackendHealth = { ready: boolean; ytdlp: string | null; ffmpeg: boolean; database: boolean };

/** GET /health/ready. Returns ready:false (rather than throwing) when a dependency is down or the API is unreachable. */
export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(`${API_BASE}/health/ready`, { credentials: "include" });
    const d = await res.json();
    return { ready: !!d.success, ytdlp: d.checks?.ytdlpVersion ?? null, ffmpeg: !!d.checks?.ffmpeg, database: !!d.checks?.database };
  } catch {
    return { ready: false, ytdlp: null, ffmpeg: false, database: false };
  }
}

// ---- Download jobs -----------------------------------------------------------

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

export function getDownloadFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const encodedMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encodedMatch) {
    try {
      return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the compatibility filename when a header is malformed.
    }
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]+))/i);
  const plainName = plainMatch?.[1]?.replace(/\\([\\"])/g, "$1") ?? plainMatch?.[2]?.trim();
  return plainName || fallback;
}

/** Saves an image via the browser. Cross-origin CDNs often block reading the
 * bytes, in which case the image opens in a new tab for a manual save. */
export async function saveImage(imageUrl: string, filename: string) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("blocked");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  } catch {
    window.open(imageUrl, "_blank", "noopener");
  }
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function formatBitrate(kbps: number | null) {
  if (!kbps) return null;
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`;
}

export function videoQualityBadge(height: number | null): { label: string; tier: "top" | "high" | "mid" | "low" } {
  if (!height) return { label: "SD", tier: "low" };
  if (height >= 2160) return { label: "4K", tier: "top" };
  if (height >= 1440) return { label: "2K", tier: "top" };
  if (height >= 1080) return { label: "FHD", tier: "high" };
  if (height >= 720) return { label: "HD", tier: "high" };
  if (height >= 480) return { label: "SD", tier: "mid" };
  return { label: "LOW", tier: "low" };
}

export function audioQualityBadge(abr: number | null): { label: string; tier: "top" | "high" | "mid" | "low" } {
  if (!abr) return { label: "STD", tier: "mid" };
  if (abr >= 256) return { label: "HIGH", tier: "top" };
  if (abr >= 160) return { label: "GOOD", tier: "high" };
  if (abr >= 96) return { label: "STD", tier: "mid" };
  return { label: "LOW", tier: "low" };
}

export function detectPlatformLabel(sourceUrl?: string | null): string {
  if (!sourceUrl) return "This site";
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("soundcloud.com") || host.includes("snd.sc")) return "SoundCloud";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("instagram.com") || host.includes("instagr.am")) return "Instagram";
    if (host.includes("twitter.com") || host.includes("x.com") || host.includes("t.co")) return "X";
    if (host.includes("facebook.com") || host.includes("fb.watch") || host.includes("fb.me")) return "Facebook";
    if (host.includes("vimeo.com")) return "Vimeo";
    if (host.includes("twitch.tv")) return "Twitch";
    if (host.includes("reddit.com") || host.includes("redd.it")) return "Reddit";
    if (host.includes("pinterest.") || host.includes("pin.it")) return "Pinterest";
    if (host.includes("snapchat.com")) return "Snapchat";
    if (host.includes("dailymotion.com") || host.includes("dai.ly")) return "Dailymotion";
    if (host.includes("bsky.app")) return "Bluesky";
    if (host.includes("tumblr.com")) return "Tumblr";
    if (host.includes("loom.com")) return "Loom";
    if (host.includes("newgrounds.com")) return "Newgrounds";
    if (host.includes("streamable.com")) return "Streamable";
    if (host.includes("rutube.ru")) return "Rutube";
    return "This site";
  } catch {
    return "This site";
  }
}

/** Short lowercase platform slug for shareable link paths, e.g. "/youtube/<id>". */
export function platformSlug(sourceUrl?: string | null): string {
  if (!sourceUrl) return "watch";
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("soundcloud.com") || host.includes("snd.sc")) return "soundcloud";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("instagram.com") || host.includes("instagr.am")) return "instagram";
    if (host.includes("twitter.com") || host.includes("x.com") || host.includes("t.co")) return "twitter";
    if (host.includes("facebook.com") || host.includes("fb.watch") || host.includes("fb.me")) return "facebook";
    if (host.includes("vimeo.com")) return "vimeo";
    if (host.includes("twitch.tv")) return "twitch";
    if (host.includes("reddit.com") || host.includes("redd.it")) return "reddit";
    if (host.includes("pinterest.") || host.includes("pin.it")) return "pinterest";
    if (host.includes("snapchat.com")) return "snapchat";
    if (host.includes("dailymotion.com") || host.includes("dai.ly")) return "dailymotion";
    if (host.includes("bsky.app")) return "bluesky";
    if (host.includes("tumblr.com")) return "tumblr";
    if (host.includes("loom.com")) return "loom";
    if (host.includes("newgrounds.com")) return "newgrounds";
    if (host.includes("streamable.com")) return "streamable";
    if (host.includes("rutube.ru")) return "rutube";
    return "watch";
  } catch {
    return "watch";
  }
}

export function friendlyError(rawMessage: string, _sourceUrl?: string | null): string {
  void _sourceUrl;
  const msg = rawMessage.toLowerCase();
  if (msg.includes("private") || msg.includes("login required")) {
    return "This video is private or requires login — it can't be downloaded.";
  }
  if (msg.includes("unsupported url") || msg.includes("no extractor")) {
    return "This link isn't from a supported site.";
  }
  if (msg.includes("404") || msg.includes("not found")) {
    return "That video couldn't be found. It may have been removed.";
  }
  if (msg.includes("timed out") || msg.includes("timeout")) {
    return "The request took too long. Please try again.";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network error") || msg.includes("load failed")) {
    return "The download service could not be reached. Check your connection and try again.";
  }
  if (msg.includes("geo") || msg.includes("not available in your country")) {
    return "This video isn't available in this region.";
  }
  return cleanRawError(rawMessage) || "Something went wrong. Please try again.";
}

/** Strips yt-dlp's "ERROR: [extractor] id: " prefix so the real reason shows through. */
function cleanRawError(rawMessage: string): string {
  const cleaned = rawMessage
    .replace(/^ERROR:\s*/i, "")
    .replace(/^\[[^\]]+\]\s*[\w-]+:\s*/, "")
    .trim();
  return firstSentence(cleaned);
}

/** Keeps only the first sentence of a message (up to the first ". "), dropping trailing links/instructions. */
export function firstSentence(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^[^.!?]*[.!?]/);
  const sentence = (match ? match[0] : cleaned).trim();
  const maxLen = 160;
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1).trimEnd()}…` : sentence;
}

export function buildFileName(title: string, ext: string, maxLen = 32) {
  const clean = (title || "download").replace(/[\\/:*?"<>|]/g, "_").trim();
  const truncated =
    clean.length > maxLen ? `${clean.slice(0, maxLen - 1).trimEnd()}…` : clean;
  return `${truncated}.${ext}`;
}

export type FilenameStyle = "classic" | "basic" | "pretty" | "nerdy";

export function shortCodec(vcodec?: string | null): string {
  if (!vcodec || vcodec === "none") return "";
  const v = vcodec.toLowerCase();
  if (v.startsWith("avc1")) return "h264";
  if (v.startsWith("hev1") || v.startsWith("hvc1")) return "h265";
  if (v.startsWith("vp09") || v.startsWith("vp9")) return "vp9";
  if (v.startsWith("vp8")) return "vp8";
  if (v.startsWith("av01")) return "av1";
  return v.split(".")[0];
}

export function styledBaseName(
  style: FilenameStyle,
  opts: {
    mode: "video" | "audio";
    title: string;
    uploader?: string | null;
    extractor?: string | null;
    videoId?: string | null;
    resolution?: string | null;
    vcodec?: string | null;
  }
) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim();
  const title = clean(opts.title || "download");
  const uploader = clean(opts.uploader || "Unknown");
  const extractor = (opts.extractor || "web").toLowerCase();
  const videoId = opts.videoId || "";
  const codec = shortCodec(opts.vcodec);
  const resolution = opts.resolution || "";

  let base: string;
  if (style === "classic") {
    base =
      opts.mode === "audio"
        ? `${extractor}_${videoId}_audio`
        : `${extractor}_${videoId}_${[resolution, codec].filter(Boolean).join("_")}`;
  } else if (style === "basic") {
    base =
      opts.mode === "audio"
        ? `${title} - ${uploader}`
        : `${title} - ${uploader} (${[resolution, codec].filter(Boolean).join(", ")})`;
  } else if (style === "pretty") {
    base =
      opts.mode === "audio"
        ? `${title} - ${uploader} (${extractor})`
        : `${title} - ${uploader} (${[resolution, codec, extractor].filter(Boolean).join(", ")})`;
  } else {
    base =
      opts.mode === "audio"
        ? `${title} - ${uploader} (${[extractor, videoId].filter(Boolean).join(", ")})`
        : `${title} - ${uploader} (${[resolution, codec, extractor, videoId].filter(Boolean).join(", ")})`;
  }

  const maxLen = 90;
  return base.length > maxLen ? `${base.slice(0, maxLen - 1).trimEnd()}…` : base;
}

export function formatDuration(seconds: number) {
  if (!seconds && seconds !== 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
