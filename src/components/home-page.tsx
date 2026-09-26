import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import toast from "@/lib/toast";
import {
  ExternalLink,
  RefreshCw,
  Clock,
  HardDrive,
  ImageIcon,
  ClipboardPaste,
  Loader2,
  Music2,
  Pause,
  Play,
  Video,
  Search,
  PanelLeftIcon,
  CirclePlay,
  User,
  Download,
  Share2,
  Sun,
  Moon,
  TriangleAlert,
  ListVideo,
} from "lucide-react";
import { PlatformIcons } from "@/components/platform-icons";
import { ProgressiveList } from "@/components/progressive-list";
import { instagramProfileUrl, instagramStoriesUrl, parseInstagramProfileLink } from "@/lib/instagram-links";
import { setDownloadsBusy } from "@/lib/busy";
import { FormatDetailsDialog } from "@/components/format-details-dialog";
import { DownloadProgressButton } from "@/components/download/download-progress-button";
import { StopDownloadDialog } from "@/components/download/stop-download-dialog";
import { reportDownloadError } from "@/lib/reportDownloadError";
import { ApiError, isCoolDown } from "@/lib/errors";
import { ErrorToast } from "@/components/error-toast";
import { ServiceStatus } from "@/components/service-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { ShareMenu } from "@/components/share-menu";
import { AudioWave } from "@/components/audio-wave";
import { usePreferences } from "@/lib/preferences";
import { playDownloadCompleteSound, playErrorSound } from "@/lib/sound";
import { togglePlay, useIsPlaying, useAudioProgress, seekTo, stopPlayback } from "@/lib/audioPlayer";
import {
  fetchInfo,
  getStoredMedia,
  saveImage,
  detectPlatformLabel,
  formatBytes,
  formatBitrate,
  formatDuration,
  friendlyErrorFor,
  errorTitleFor,
  getTombstone,
  buildFileName,
  styledBaseName,
  videoQualityBadge,
  audioQualityBadge,
  type MediaInfo,
  type MediaFormat,
  type Tombstone,
} from "@/lib/api";
import { fetchStreamBlob, saveBlobToDisk, startBrowserDownload } from "@/lib/stream-download";
import { audioRows, bestAudioFormat, videoRows } from "@/lib/format-order";
import { shareUrlForPath, storedPathFromLocation } from "@/lib/media-path";
import { bumpDownloadCount } from "@/lib/site-stats";
import { SettingsMenu } from "@/components/settings-menu";
import { FLOW_STEPS } from "@/lib/flow-steps";
import { site } from "@/config/site";
import { safeHref } from "@/lib/safe-url";
import { applySeo } from "@/lib/seo";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { API_DOCS_URL, GithubFooter, GithubMark, REPOS } from "@/components/github-link";
import { InstallApp } from "@/components/install-app";
import { UnavailableCard } from "@/components/unavailable-card";
import { BEST_BADGE_CLASS, QUALITY_BADGE_CLASSES, RECOMMENDED_BADGE_CLASS } from "@/lib/download-format-presentation";
import { coerceMediaUrl } from "@/lib/media-url";

type FormatKey = string;

/** One shared empty list: a fresh `[]` on every render would look like a new list to ProgressiveList each time. */
const NO_ITEMS: never[] = [];

/** Turn the audio play buttons back on by setting VITE_ENABLE_AUDIO_PREVIEW=true. */
const AUDIO_PREVIEW_ENABLED = import.meta.env.VITE_ENABLE_AUDIO_PREVIEW === "true";

function keyFor(mode: "video" | "audio", format_id?: string) {
  return `${mode}:${format_id ?? "best"}`;
}

// yt-dlp can't report an exact size for DASH/fragmented formats up front, so
// the server estimates one from bitrate * duration — shown the same as an
// exact size (the "Format details" dialog still notes when it's estimated).
/** "12.3 MB", or "~12.3 MB" for an estimate (from the bitrate, or the source's own guess). */
function sizeLabelFor(filesize: number | null, approx = false) {
  const size = formatBytes(filesize);
  return size ? `${approx ? "~" : ""}${size}` : undefined;
}

type BrandState = "idle" | "fetching" | "downloading";

/** The BlazFetch mark, used both in the header and beside the hero title —
 * a fixed white tile with a black bolt, same flat-icon treatment as the
 * platform grid's own brand logos (plain shape, real color, no theme
 * tinting) rather than a soft theme-colored bubble. It also doubles as a
 * live status indicator: a minimal breathing scale while idle, a thin
 * rotating arc while `/api/info` is in flight, and once a download actually
 * starts the icon swaps to a Download glyph inside a real progress ring
 * (driven by the download's own percentage) instead of sitting there
 * purely decoratively. */
function BrandMark({ state, progress = 0, className = "size-7" }: { state: BrandState; progress?: number | null; className?: string }) {
  // `null` means "working, but no real percentage" (a download handed to the browser): show the running arc.
  const indeterminate = progress === null;
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const reduceMotion = useReducedMotion();

  // The icon cycles copy link, paste and download while the app is idle or fetching; during a download it stays on
  // the download arrow. The tile keeps one fixed size and shape for every icon.
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (state === "downloading" || reduceMotion) return;
    const timer = window.setInterval(() => setStep((n) => (n + 1) % FLOW_STEPS.length), 1800);
    return () => window.clearInterval(timer);
  }, [state, reduceMotion]);
  const current = state === "downloading" ? { Icon: Download, radius: 8 } : { Icon: FLOW_STEPS[step].Icon, radius: 8 };
  const Icon = current.Icon;
  const popKey = state === "downloading" ? "download" : step;

  return (
    <span className={`relative flex shrink-0 items-center justify-center ${className}`}>
      {/* The whole tile flips in on every step (the icon comes with it); the corner radius stays the same throughout. */}
      <motion.span
        key={popKey}
        initial={reduceMotion ? false : { rotateY: -100, scale: 0.8, opacity: 0.3 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1, borderRadius: current.radius }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        style={{ transformPerspective: 400 }}
        className="absolute inset-0 flex items-center justify-center border border-black/10 bg-white text-black"
      >
        <Icon className="size-[50%]" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </motion.span>

      {/* The ring follows the square's outline: an arc running around it while working, a fill for real progress. */}
      {(state === "fetching" || state === "downloading") && (
        <svg className="pointer-events-none absolute inset-[-3px]" viewBox="0 0 100 100" fill="none">
          <rect x="3" y="3" width="94" height="94" rx="20" stroke="var(--foreground)" strokeOpacity="0.15" strokeWidth="5" />
          {state === "fetching" || indeterminate ? (
            <motion.rect
              x="3"
              y="3"
              width="94"
              height="94"
              rx="20"
              pathLength={100}
              stroke="var(--foreground)"
              strokeOpacity="0.85"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="22 78"
              animate={{ strokeDashoffset: [0, -100] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <motion.rect
              x="3"
              y="3"
              width="94"
              height="94"
              rx="20"
              pathLength={100}
              stroke="var(--foreground)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="100"
              animate={{ strokeDashoffset: 100 * (1 - pct / 100) }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          )}
        </svg>
      )}
    </span>
  );
}

/** Loads a slice of a large collection (Pinterest boards): POST /fetch with rangeStart/rangeEnd. */
function RangePicker({
  range,
  disabled,
  onLoad,
}: {
  range: NonNullable<MediaInfo["range"]>;
  disabled: boolean;
  onLoad: (start: number, end: number) => void;
}) {
  const [start, setStart] = useState(String(range.start));
  const [end, setEnd] = useState(String(range.end));
  const s = Math.max(1, Math.floor(Number(start)) || 1);
  const e = Math.min(range.total, Math.max(s, Math.floor(Number(end)) || s));
  const tooBig = e - s + 1 > range.max;
  return (
    <div className="mx-4 mb-3 flex flex-col gap-2 rounded-xl border bg-card/60 p-3 text-xs">
      <p className="text-muted-foreground">
        Showing items {range.start}–{range.end} of {range.total}
        {range.truncated ? " (more available)" : ""}. Load another range:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          inputMode="numeric"
          value={start}
          onChange={(ev) => setStart(ev.target.value)}
          aria-label="Range start"
          className="h-8 w-20"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          inputMode="numeric"
          value={end}
          onChange={(ev) => setEnd(ev.target.value)}
          aria-label="Range end"
          className="h-8 w-20"
        />
        <Button size="sm" variant="secondary" disabled={disabled || tooBig} onClick={() => onLoad(s, e)}>
          Load range
        </Button>
        {tooBig && <span className="text-destructive">Max {range.max} items per request.</span>}
      </div>
    </div>
  );
}

const MENU_ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3 text-left transition hover:bg-card/80";
const MENU_ROW_ICON_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background";

export function HomePage() {
  const { prefs } = usePreferences();
  const { theme, setTheme } = useTheme();
  const isDarkTheme =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [url, setUrl] = useState("");
  const [fetchedUrl, setFetchedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  // Set when the backend says a video it remembers is gone (410 MEDIA_UNAVAILABLE).
  const [unavailable, setUnavailable] = useState<Tombstone | null>(null);
  const [progress, setProgress] = useState<Record<FormatKey, number>>({});
  const [downloadStatus, setDownloadStatus] = useState<Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">>({});
  const [activeTab, setActiveTab] = useState<"video" | "audio" | "images" | "stories">(prefs.defaultMode);
  // Adjusted during render (not an effect) when the preference changes, so the tab switches in the same paint
  // instead of flashing the old one first. See https://react.dev/learn/you-might-not-need-an-effect.
  const [seenDefaultMode, setSeenDefaultMode] = useState(prefs.defaultMode);
  if (prefs.defaultMode !== seenDefaultMode) {
    setSeenDefaultMode(prefs.defaultMode);
    setActiveTab(prefs.defaultMode);
  }
  // An Instagram profile also looks up its stories in the background: they get their own tab once found.
  const [stories, setStories] = useState<{ username: string; status: "loading" | "ready"; info?: MediaInfo } | null>(null);
  const storiesSeq = useRef(0);
  const [previewLoading, setPreviewLoading] = useState<Record<FormatKey, boolean>>({});
  const [previewProgress, setPreviewProgress] = useState<Record<FormatKey, number>>({});
  // The only remaining confirm dialog is "stop the format you just clicked
  // again while it was preparing" — starting a *different* format no longer
  // forces a choice (see guardedStart), so there's nothing left to "switch".
  const [confirmState, setConfirmState] = useState<{ kind: "stop"; mode: "video" | "audio"; key: FormatKey; sizeLabel?: string } | null>(
    null
  );
  const blobCache = useState(() => new Map<FormatKey, { blobUrl: string; filename: string; blob: Blob }>())[0];
  const pendingFetches = useState(
    () => new Map<FormatKey, Promise<{ blobUrl: string; filename: string; blob: Blob }>>()
  )[0];
  const downloadControllers = useState(() => new Map<FormatKey, AbortController>())[0];
  const downloadRequestSeq = useState(() => new Map<FormatKey, number>())[0];
  const previewControllers = useState(() => new Map<FormatKey, AbortController>())[0];
  const previewRequestSeq = useState(() => new Map<FormatKey, number>())[0];
  const userStoppedKeys = useState(() => new Set<FormatKey>())[0];
  // Which key currently "owns" a video/audio download slot, updated synchronously (a ref, not React
  // state) so a click fired right after the one that started a download always sees it, even before
  // the state update from that first click has been rendered — see guardedStart.
  const activeDownloadKeys = useState(() => new Map<"video" | "audio", FormatKey>())[0];

  // Back/forward between stored pages (and back to the home page).
  useEffect(() => {
    const onPopState = () => {
      const path = storedPathFromLocation(window.location.pathname);
      if (path) {
        void openStoredPath(path);
      } else {
        setInfo(null);
        setUnavailable(null);
        setUrl("");
        setFetchedUrl("");
        applySeo();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetchedRef.current) return; // guards against React 18 StrictMode's double-invoked mount effect in dev
    autoFetchedRef.current = true;
    const storedPath = storedPathFromLocation(window.location.pathname);
    const shared = new URLSearchParams(window.location.search).get("url");
    if (storedPath) {
      // A page like /youtube/<id>: served from the backend's stored copy.
      void openStoredPath(storedPath);
    } else if (shared) {
      // A legacy /?url=<link> share link: fetch it, then the address bar becomes the stable page path.
      void handleSearch(shared, { preserveAddress: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Format ids (itags like 18, 137, 251) are reused across every YouTube video,
   * but the blob cache and in-flight/abort tracking below are keyed only by
   * `mode:format_id` — with no video identity — so they must be wiped whenever
   * a new video loads. Otherwise "Download" for a freshly-fetched video can
   * silently hand back a previous video's cached file for the same format id.
   */
  function resetPerVideoDownloadState() {
    for (const controller of downloadControllers.values()) controller.abort();
    for (const controller of previewControllers.values()) controller.abort();
    downloadControllers.clear();
    downloadRequestSeq.clear();
    previewControllers.clear();
    previewRequestSeq.clear();
    pendingFetches.clear();
    storiesSeq.current += 1; // a stories lookup still running belongs to the previous link
    setStories(null);
    // The previewed audio only lives in this page's memory: stop it and free it when a new link is loaded.
    stopPlayback();
    for (const { blobUrl } of blobCache.values()) URL.revokeObjectURL(blobUrl);
    blobCache.clear();
    userStoppedKeys.clear();
    activeDownloadKeys.clear();
    setProgress({});
    setDownloadStatus({});
    setPreviewLoading({});
    setPreviewProgress({});
  }

  /** The Paste button: reads the clipboard, fills the box and fetches straight away. */
  async function pasteFromClipboard() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        toast.error("Nothing to paste. Copy a video link first.");
        return;
      }
      setUrl(text);
      void handleSearch(text);
    } catch {
      // Blocked or unsupported: fall back to the normal paste gesture in the box.
      toast.error("Allow clipboard access, or long-press the box and choose Paste.");
    }
  }

  function goHome() {
    window.location.href = "/";
  }

  /** Puts a loaded result on screen and points the address bar at its stable page path. */
  /** Looks up an Instagram account's stories in the background; the Stories tab appears only when there are some. */
  async function loadStories(username: string) {
    const seq = ++storiesSeq.current;
    setStories({ username, status: "loading" });
    try {
      const data = await fetchInfo(instagramStoriesUrl(username));
      if (seq !== storiesSeq.current) return;
      const found = (data.carouselVideos?.length ?? 0) + (data.images?.length ?? 0) > 0;
      setStories(found ? { username, status: "ready", info: data } : null);
    } catch {
      // No live stories (or a private account): the profile stays as it is, without a Stories tab.
      if (seq === storiesSeq.current) setStories(null);
    }
  }

  function showResult(data: MediaInfo, sourceUrl: string, opts: { keepAddress?: boolean } = {}) {
    setUnavailable(null);
    setInfo(data);
    setFetchedUrl(sourceUrl);
    const profile = parseInstagramProfileLink(sourceUrl);
    if (profile?.kind === "profile" && data.type === "carousel") void loadStories(profile.username);
    // The box empties once the result shows; Refresh and Share use the remembered link, and a failed fetch keeps it for retry.
    setUrl("");
    if (data.type === "images") setActiveTab("images");
    else if (data.type === "carousel") {
      // A profile opens on its photos (Gallery first); any other post or carousel opens on its videos.
      const photosFirst = profile?.kind === "profile" && (data.images?.length ?? 0) > 0;
      setActiveTab(photosFirst || !data.carouselVideos?.length ? "images" : "video");
    }
    else if (data.audioOnly) setActiveTab("audio");
    // Any other result: pick a tab that has content, never keep the previous result's tab (it could be empty).
    else setActiveTab(prefs.defaultMode === "audio" && data.audioFormats.length ? "audio" : "video");
    // The address bar becomes the stable page path (/youtube/<id>), so copying it shares this video.
    if (!opts.keepAddress) {
      window.history.replaceState(null, "", data.stored?.path ?? `/?url=${encodeURIComponent(sourceUrl)}`);
    }
    applySeo({
      title: data.title,
      description: [data.uploader, data.extractor ? `on ${data.extractor}` : null].filter(Boolean).length
        ? `${data.title}${data.uploader ? ` by ${data.uploader}` : ""}. ${site.tagline}`
        : undefined,
      image: data.thumbnail?.startsWith("http") ? data.thumbnail : undefined,
      path: data.stored?.path ?? null,
    });
  }

  /** The backend remembers this video but found it gone: show what it was instead of an error. */
  function showUnavailable(tombstone: Tombstone, sourceUrl?: string) {
    const link = tombstone.sourceUrl ?? sourceUrl ?? null;
    setInfo(null);
    setUnavailable({ ...tombstone, sourceUrl: link });
    if (link) {
      setUrl(link);
      setFetchedUrl(link);
    }
    if (tombstone.path) window.history.replaceState(null, "", tombstone.path);
    applySeo({ title: `${tombstone.title ?? "Video"} (unavailable)`, noindex: true, path: window.location.pathname });
  }

  function showFailure(err: unknown) {
    console.error("[fetch video info]", err instanceof Error ? err.message : err);
    toast.error(<ErrorToast title={errorTitleFor(err)} message={friendlyErrorFor(err)} />);
    if (prefs.soundEnabled) playErrorSound();
  }

  async function handleSearch(
    inputUrl = url,
    opts: { preserveAddress?: boolean; forceRefresh?: boolean; rangeStart?: number; rangeEnd?: number } = {}
  ) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const requestedUrl = coerceMediaUrl(inputUrl);
    if (!requestedUrl) {
      toast.error("Paste a video URL first.");
      return;
    }
    setLoading(true);
    setInfo(null);
    setUnavailable(null);
    resetPerVideoDownloadState();
    // A share-link visit has nothing typed in the search box: leave it alone instead of flashing the raw URL.
    if (!opts.preserveAddress) {
      setUrl(requestedUrl);
      // Clear the previous video's page path from the address bar right away.
      window.history.replaceState(null, "", "/");
      applySeo();
    }
    try {
      const data = await fetchInfo(requestedUrl, {
        ...(opts.forceRefresh ? { forceRefresh: true } : {}),
        ...(opts.rangeStart ? { rangeStart: opts.rangeStart, rangeEnd: opts.rangeEnd } : {}),
      });
      // The fetched URL stays in the box: it is what the result card below is showing.
      showResult(data, requestedUrl);
      toast.success(
        <div className="flex max-w-56 flex-col">
          <span className="font-medium text-primary">Video found</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">{data.title}</span>
        </div>
      );
    } catch (err) {
      const tombstone = getTombstone(err);
      if (tombstone) showUnavailable(tombstone, requestedUrl);
      else showFailure(err);
    } finally {
      setLoading(false);
    }
  }

  /** Follows an in-app link to a stored page (e.g. a video's playlist) and keeps the browser's back button working. */
  function goToStoredPath(path: string) {
    window.history.pushState(null, "", path);
    void openStoredPath(path);
  }

  /** Opens a stable page path such as /youtube/<id> from the backend's stored copy. */
  async function openStoredPath(path: string) {
    setLoading(true);
    setInfo(null);
    setUnavailable(null);
    resetPerVideoDownloadState();
    try {
      const data = await getStoredMedia(path);
      showResult(data, data.webpage_url, { keepAddress: true });
    } catch (err) {
      const tombstone = getTombstone(err);
      if (tombstone) {
        showUnavailable(tombstone);
      } else {
        showFailure(err);
        window.history.replaceState(null, "", "/");
      }
    } finally {
      setLoading(false);
    }
  }

  function buildName(mode: "video" | "audio", media: MediaInfo, formatMeta?: MediaFormat) {
    return styledBaseName(prefs.filenameStyle, {
      mode,
      title: media.title,
      uploader: media.uploader,
      extractor: media.extractor,
      videoId: media.id,
      resolution: formatMeta?.resolution ?? null,
      vcodec: formatMeta?.vcodec ?? null,
    });
  }

  async function fetchBlob(
    mode: "video" | "audio",
    key: FormatKey,
    media: MediaInfo,
    format_id?: string,
    formatMeta?: MediaFormat,
    onProgress?: (pct: number) => void,
    signal?: AbortSignal,
    urlOverride?: string
  ) {
    const cached = blobCache.get(key);
    if (cached) return cached;

    // Download and preview share one fetch per format: if one is already in
    // flight (from either the Download button or the Play button), the other
    // just joins it instead of starting a second network request.
    const pending = pendingFetches.get(key);
    if (pending) return pending;

    const promise = (async () => {
      const baseName = buildName(mode, media, formatMeta);
      // The file arrives through one streamed request. Audio is small enough to keep in memory for playback.
      const { blob, filename } = await fetchStreamBlob(
        { url: urlOverride ?? fetchedUrl, kind: mode, formatId: format_id, filename: baseName, mode: "auto" },
        { signal, onProgress, fallbackName: `${baseName}.${mode === "audio" ? "m4a" : "mp4"}` }
      );
      const result = { blobUrl: URL.createObjectURL(blob), filename, blob };
      blobCache.set(key, result);
      return result;
    })();

    pendingFetches.set(key, promise);
    try {
      return await promise;
    } finally {
      pendingFetches.delete(key);
    }
  }

  /** Releases the key's claim on its mode's download slot, if it still holds one. */
  function releaseActiveDownload(key: FormatKey) {
    const mode = key.split(":")[0] as "video" | "audio";
    if (activeDownloadKeys.get(mode) === key) activeDownloadKeys.delete(mode);
  }

  function clearDownloadState(key: FormatKey) {
    releaseActiveDownload(key);
    setProgress((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setDownloadStatus((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
  }

  function closeStopDialogForKeys(keys: FormatKey[]) {
    setConfirmState((current) => (current && keys.includes(current.key) ? null : current));
  }

  /**
   * Aborts whichever controller — download-side or preview-side — actually
   * owns `key` and resets all its UI state. Used when the user explicitly
   * stops the format that's currently running.
   */
  function interruptKey(key: FormatKey) {
    downloadControllers.get(key)?.abort();
    previewControllers.get(key)?.abort();
    downloadRequestSeq.set(key, (downloadRequestSeq.get(key) ?? 0) + 1);
    previewRequestSeq.set(key, (previewRequestSeq.get(key) ?? 0) + 1);
    clearDownloadState(key);
    // The aborted call's own finally-block bails out early (isCurrent() is now
    // false), so its preview spinner/wave would otherwise be stuck forever.
    setPreviewLoading((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setPreviewProgress((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function cancelDownload(_mode: "video" | "audio", key: FormatKey) {
    userStoppedKeys.add(key);
    interruptKey(key);
  }

  /**
   * Gates every Download/Play click: if `key` is already queued, clicking it
   * again just pulls it out of the queue immediately — nothing has actually
   * started yet, so there's nothing worth confirming. If it's actively
   * running ("preparing"), clicking again asks for confirmation before
   * stopping it. Starting a *different* format no longer forces a choice —
   * the server's concurrency limit decides whether it runs immediately or
   * queues (see fetchBlob/runDownload's onStatus handling).
   */
  function guardedStart(
    mode: "video" | "audio",
    key: FormatKey,
    status: "queued" | "preparing" | "ready" | "downloaded" | undefined,
    start: () => void,
    sizeLabel?: string
  ) {
    if (status === "queued") {
      cancelDownload(mode, key);
      return;
    }
    if (status === "preparing") {
      setConfirmState({ kind: "stop", mode, key, sizeLabel });
      return;
    }
    // A guest gets one video (and one audio) download at a time; the server would reject a second with SERVER_BUSY
    // anyway, so this catches it instantly, client-side, instead of sending the request and waiting on that reply.
    // A ref, not the downloadStatus state, so a click fired right after the one that started a download is never
    // caught by React not having re-rendered with that first click's "preparing" status yet.
    const runningKey = activeDownloadKeys.get(mode);
    if (runningKey !== undefined && runningKey !== key) {
      reportDownloadError(new ApiError("SERVER_BUSY", "You already have a download running."), null, prefs.soundEnabled, "Download", undefined, mode);
      return;
    }
    activeDownloadKeys.set(mode, key);
    start();
  }

  /**
   * Paces `progress[key]` upward while a download the browser owns (via startBrowserDownload) is
   * preparing — that path never reads the response body, by design, so large
   * files never sit in memory, but it also means the page has no real byte count to show. Rather than
   * leave the CTA's fill bar and percentage blank, it climbs on the same ever-slowing curve
   * fetchStreamBlob already uses when *it* doesn't know a total size, capped short of 100% until the
   * caller's own success/failure signal arrives. Returns a function that stops the timer; the caller is
   * responsible for setting the final value (100 on success, cleared on failure).
   */
  function simulateProgress(key: FormatKey): () => void {
    const startedAt = Date.now();
    const TIMESCALE_MS = 4000; // ~60% at 4s, ~87% at 10s, ~95% cap from there
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const percent = Math.round(95 * (1 - Math.exp(-elapsed / TIMESCALE_MS)));
      setProgress((p) => ({ ...p, [key]: percent }));
    }, 200);
    return () => clearInterval(timer);
  }

  async function runDownload(
    mode: "video" | "audio",
    format_id?: string,
    mediaOverride?: MediaInfo,
    formatMeta?: MediaFormat,
    urlOverride?: string,
    keyOverride?: FormatKey
  ) {
    const media = mediaOverride ?? info;
    if (!media) return;
    const key = keyOverride ?? keyFor(mode, format_id);

    downloadControllers.get(key)?.abort();
    const controller = new AbortController();
    downloadControllers.set(key, controller);
    const requestId = (downloadRequestSeq.get(key) ?? 0) + 1;
    downloadRequestSeq.set(key, requestId);
    const isCurrent = () => downloadRequestSeq.get(key) === requestId;
    const clearState = () => {
      clearDownloadState(key);
    };

    // Reset to idle up front so a re-click on an already-started row
    // doesn't keep showing that stale label for an instant.
    clearDownloadState(key);

    // Audio the user already listened to is in memory: save that instead of asking the server again.
    const cached = blobCache.get(key);
    if (cached) {
      saveBlobToDisk(cached.blob, cached.filename);
      releaseActiveDownload(key);
      setDownloadStatus((s) => ({ ...s, [key]: "downloaded" }));
      if (prefs.soundEnabled) playDownloadCompleteSound();
      return;
    }

    try {
      setProgress((p) => ({ ...p, [key]: 0 }));
      setDownloadStatus((s) => ({ ...s, [key]: "preparing" }));
      // One request straight to the browser's download manager: the backend decides on its own whether to
      // stream live or prepare a compatible file first. It resolves when bytes start flowing (or rejects
      // with the server's own error), so "Preparing" ends exactly when the download begins — but the page
      // never sees a byte count along the way, so pace the bar instead of leaving it blank (simulateProgress).
      const stopSimulating = simulateProgress(key);
      try {
        await startBrowserDownload(
          {
            url: urlOverride ?? fetchedUrl,
            kind: mode,
            formatId: format_id,
            filename: buildName(mode, media, formatMeta),
            mode: "auto",
          },
          { signal: controller.signal }
        );
      } finally {
        stopSimulating();
      }
      if (!isCurrent()) return;
      releaseActiveDownload(key);
      setProgress((p) => ({ ...p, [key]: 100 }));
      setDownloadStatus((s) => ({ ...s, [key]: "downloaded" }));
      bumpDownloadCount(); // The footer counts this immediately; the server confirms it later on its own.
      closeStopDialogForKeys([key]);
      if (prefs.soundEnabled) playDownloadCompleteSound();
    } catch (err) {
      if (!isCurrent()) return; // superseded by a newer click in the same mode — stay quiet
      if (err instanceof DOMException && err.name === "AbortError" && userStoppedKeys.delete(key)) {
        // Only a real click on Stop adds a key here.
        toast.success("Download stopped.");
        clearState();
        return;
      }
      userStoppedKeys.delete(key);
      reportDownloadError(err, urlOverride ?? fetchedUrl, prefs.soundEnabled, "Download", undefined, mode);
      clearState();
    }
  }

  // Images are plain files on the source's CDN (the backend only lists them),
  // so they save straight from the browser and need no job.
  async function runImageDownload(imageUrl: string, key: FormatKey, title: string) {
    clearDownloadState(key);
    try {
      setProgress((p) => ({ ...p, [key]: 0 }));
      setDownloadStatus((s) => ({ ...s, [key]: "preparing" }));
      const ext = imageUrl.match(/\.(jpe?g|png|webp|gif)(?:[?#]|$)/i)?.[1]?.toLowerCase() ?? "jpg";
      await saveImage(imageUrl, buildFileName(title, ext, 60));
      releaseActiveDownload(key);
      setProgress((p) => ({ ...p, [key]: 100 }));
      setDownloadStatus((s) => ({ ...s, [key]: "downloaded" }));
      if (prefs.soundEnabled) playDownloadCompleteSound();
    } catch (err) {
      reportDownloadError(err, fetchedUrl, prefs.soundEnabled);
      clearDownloadState(key);
    }
  }

  // Carousel/board videos: the item's own formatId belongs to this post, so the server prepares it
  // from the post link (mode=prepare).
  async function runCarouselVideoDownload(formatId: string, key: FormatKey, sourceUrl: string = fetchedUrl, title: string = info?.title ?? "video") {
    downloadControllers.get(key)?.abort();
    const controller = new AbortController();
    downloadControllers.set(key, controller);
    const requestId = (downloadRequestSeq.get(key) ?? 0) + 1;
    downloadRequestSeq.set(key, requestId);
    const isCurrent = () => downloadRequestSeq.get(key) === requestId;

    clearDownloadState(key);
    try {
      setProgress((p) => ({ ...p, [key]: 0 }));
      setDownloadStatus((s) => ({ ...s, [key]: "preparing" }));
      // Always mode: "prepare" (a carousel item is served from the post link, not its own direct URL) —
      // still handed to the browser's download manager the same as any other startBrowserDownload call, so
      // it gets the same paced progress, not the job pipeline's real percent (see simulateProgress above).
      const stopSimulating = simulateProgress(key);
      try {
        await startBrowserDownload(
          { url: sourceUrl, kind: "video", formatId, filename: sanitizeFilenameLocal(title), mode: "prepare" },
          { signal: controller.signal }
        );
      } finally {
        stopSimulating();
      }
      if (!isCurrent()) return;
      releaseActiveDownload(key);
      setProgress((p) => ({ ...p, [key]: 100 }));
      setDownloadStatus((s) => ({ ...s, [key]: "downloaded" }));
      bumpDownloadCount(); // The footer counts this immediately; the server confirms it later on its own.
      closeStopDialogForKeys([key]);
      if (prefs.soundEnabled) playDownloadCompleteSound();
    } catch (err) {
      if (!isCurrent()) return;
      if (err instanceof DOMException && err.name === "AbortError") {
        clearDownloadState(key);
        return;
      }
      reportDownloadError(err, fetchedUrl, prefs.soundEnabled, "Download", undefined, "video");
      clearDownloadState(key);
    }
  }

  async function playAudio(
    format_id: string | undefined,
    media: MediaInfo,
    formatMeta?: MediaFormat,
    keyOverride?: FormatKey,
    urlOverride?: string
  ) {
    const key = keyOverride ?? keyFor("audio", format_id);
    const cached = blobCache.get(key);
    if (cached) {
      togglePlay(key, cached.blobUrl);
      return;
    }

    // Re-clicking play while it's still preparing cancels that attempt and starts over.
    previewControllers.get(key)?.abort();
    const controller = new AbortController();
    previewControllers.set(key, controller);
    const requestId = (previewRequestSeq.get(key) ?? 0) + 1;
    previewRequestSeq.set(key, requestId);
    const isCurrent = () => previewRequestSeq.get(key) === requestId;

    setPreviewLoading((p) => ({ ...p, [key]: true }));
    setPreviewProgress((p) => ({ ...p, [key]: 0 }));
    // Play shares the same fetch as the Download button, so it drives the same
    // Preparing → Ready status — it just stops at "Ready" instead of also
    // saving the file, leaving that for an explicit Download click.
    setProgress((p) => ({ ...p, [key]: 0 }));
    setDownloadStatus((s) => ({ ...s, [key]: "preparing" }));
    try {
      const { blobUrl } = await fetchBlob(
        "audio",
        key,
        media,
        format_id,
        formatMeta,
        (pct) => {
          setPreviewProgress((p) => ({ ...p, [key]: pct }));
          setProgress((p) => ({ ...p, [key]: pct }));
        },
        controller.signal,
        urlOverride
      );
      if (!isCurrent()) return;
      setProgress((p) => ({ ...p, [key]: 100 }));
      setDownloadStatus((s) => ({ ...s, [key]: "ready" }));
      closeStopDialogForKeys([key]);
      togglePlay(key, blobUrl);
    } catch (err) {
      if (!isCurrent()) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      const rawMessage = err instanceof Error ? err.message : "Playback failed.";
      console.error("[player]", rawMessage);
      // At capacity (e.g. a download is already running): the same friendly orange "Hang tight" as a download gets.
      if (isCoolDown(err)) reportDownloadError(err, null, false, "Download", undefined, "audio");
      else toast.error("Couldn't play this audio");
      setDownloadStatus((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      setProgress((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    } finally {
      if (isCurrent()) {
        setPreviewLoading((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
        setPreviewProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
    }
  }

  // Drives the BrandMark's live status: any key still "preparing" means a
  // download is actively running, shown with its own real progress ring —
  // otherwise the brand mark reflects the info-fetch request instead.
  const preparingKeys = (Object.keys(downloadStatus) as FormatKey[]).filter((k) => downloadStatus[k] === "preparing");
  const isDownloading = preparingKeys.length > 0;
  // Lets an automatic app update wait until no download is running.
  useEffect(() => {
    setDownloadsBusy(isDownloading);
    return () => setDownloadsBusy(false);
  }, [isDownloading]);
  // Real for an audio preview, simulated for a download (see simulateProgress) — either way
  // progress[key] is always populated while preparing, so this ring is never left to just spin.
  const knownProgress = preparingKeys.map((k) => progress[k] ?? 0).filter((v) => v > 0);
  const brandProgress = isDownloading
    ? knownProgress.length
      ? knownProgress.reduce((sum, v) => sum + v, 0) / knownProgress.length
      : null
    : 0;
  const brandState: BrandState = isDownloading ? "downloading" : loading ? "fetching" : "idle";

  // Adjusted during render (not an effect): once the download this dialog was confirming a stop for is no longer
  // "preparing", the dialog closes itself in the same paint instead of lingering for a frame.
  if (confirmState && downloadStatus[confirmState.key] !== "preparing") {
    setConfirmState(null);
  }

  // The page path (/youtube/<id>) is what gets shared, so the link opens instantly from the backend's stored copy.
  const shareUrl = fetchedUrl && info ? shareUrlForPath(window.location.origin, info.stored?.path, fetchedUrl) : null;

  return (
    // The page itself scrolls, like any website: no fixed-height scroll box, whose height (svh) is shorter than
    // the screen once iOS Safari's toolbar collapses, which cut the list off above an empty band.
    <div className="w-full min-w-0">
    <div
      className={[
        `relative flex min-h-svh min-w-0 w-full flex-col items-center justify-center gap-8 px-4 pb-32 sm:pb-24 ${
          loading || info ? "pt-32 sm:pt-24" : "pt-24 sm:pt-16"
        }`,
        "after:pointer-events-none after:fixed after:inset-0 after:-z-10 after:content-['']",
        "after:[background-image:radial-gradient(circle_at_15%_10%,color-mix(in_oklch,var(--primary),transparent_92%)_0%,transparent_45%),radial-gradient(circle_at_85%_90%,color-mix(in_oklch,var(--primary),transparent_94%)_0%,transparent_50%),radial-gradient(color-mix(in_oklch,var(--foreground),transparent_82%)_1px,transparent_1.4px)]",
        "after:[background-size:auto,auto,28px_28px]",
        "after:[mask-image:radial-gradient(ellipse_55%_50%_at_50%_42%,transparent_0%,black_100%)]",
        "after:[-webkit-mask-image:radial-gradient(ellipse_55%_50%_at_50%_42%,transparent_0%,black_100%)]",
      ].join(" ")}
    >
      <StopDownloadDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        sizeLabel={confirmState?.sizeLabel}
        onConfirmStop={() => confirmState && cancelDownload(confirmState.mode, confirmState.key)}
      />

      {/* Overlay header, full-bleed bar with a centered max-w-7xl container.
          Core status/action icons stay inline at every size; the small-screen
          menu is only for secondary actions so it does not feel empty. */}
      <div className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Desktop-only wordmark, left of the action row — BrandMark
                doubles as a live status indicator (idle glow / fetching
                spinner / real download progress ring), not just a logo. */}
            <button
              type="button"
              onClick={goHome}
              className="hidden items-center gap-2.5 rounded-full text-base font-semibold tracking-tight outline-none transition hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/30 lg:flex"
            >
              <BrandMark state={brandState} progress={brandProgress} className="size-10" />
              {site.name}
            </button>

            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Menu">
                    <PanelLeftIcon className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(20rem,calc(100vw-1.5rem))] px-0">
                  <SheetHeader className="border-b px-4 py-4">
                    <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                      <BrandMark state={brandState} progress={brandProgress} className="size-10" />
                      {site.name}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-3 p-4">
                    <ShareMenu
                      shareableUrl={shareUrl}
                      trigger={
                        <button type="button" className={MENU_ROW_CLASS}>
                          <span className="min-w-0">
                            <p className="text-sm font-medium">Share</p>
                            <p className="truncate text-xs text-muted-foreground">Copy or share this page.</p>
                          </span>
                          <span className={MENU_ROW_ICON_CLASS}>
                            <Share2 className="size-4" />
                          </span>
                        </button>
                      }
                    />
                    <button
                      type="button"
                      className={MENU_ROW_CLASS}
                      onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                    >
                      <span className="min-w-0">
                        <p className="text-sm font-medium">Theme</p>
                        <p className="truncate text-xs text-muted-foreground">Switch light or dark mode.</p>
                      </span>
                      <span className={MENU_ROW_ICON_CLASS}>
                        {isDarkTheme ? <Moon className="size-4" /> : <Sun className="size-4" />}
                      </span>
                    </button>
                    <InstallApp />
                    <p className="px-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project</p>
                    {REPOS.map((repo) => (
                      <a
                        key={repo.url}
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={MENU_ROW_CLASS}
                      >
                        <span className="min-w-0">
                          <p className="text-sm font-medium">{repo.name.replace(" API", "")} on GitHub</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {repo.detail === "blazfetch-web" ? "Give a star, report an issue." : "The API this app runs on."}
                          </p>
                        </span>
                        <span className={MENU_ROW_ICON_CLASS}>
                          <GithubMark className="size-4" />
                        </span>
                      </a>
                    ))}
                    <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer" className={MENU_ROW_CLASS}>
                      <span className="min-w-0">
                        <p className="text-sm font-medium">API documentation</p>
                        <p className="truncate text-xs text-muted-foreground">Every endpoint, with examples.</p>
                      </span>
                      <span className={MENU_ROW_ICON_CLASS}>
                        <ExternalLink className="size-4" />
                      </span>
                    </a>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-2 rounded-full text-base font-semibold tracking-tight outline-none transition hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/30 sm:hidden"
            >
              <BrandMark state={brandState} progress={brandProgress} className="size-10" />
              {site.name}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ServiceStatus />
            <SettingsMenu />
            <div className="lg:hidden">
              <ShareMenu shareableUrl={shareUrl} />
            </div>
            <div className="hidden lg:block">
              <ShareMenu shareableUrl={shareUrl} />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex w-full max-w-xl flex-col items-center gap-3 text-center"
      >
        <h1>
          <button
            type="button"
            onClick={goHome}
            className="rounded-full text-3xl font-semibold tracking-tight outline-none transition hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-4xl"
          >
            {site.name}
          </button>
        </h1>
        <p className="mx-auto max-w-[240px] text-center text-sm text-muted-foreground sm:max-w-none">
          {site.tagline}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex w-full max-w-xl flex-col items-center gap-2 sm:flex-row"
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            if (!prefs.fetchOnPaste) return;
            const pastedUrl = e.clipboardData.getData("text").trim();
            if (!pastedUrl) return;
            e.preventDefault();
            setUrl(pastedUrl);
            void handleSearch(pastedUrl);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Paste a video URL (YouTube, TikTok, Instagram…)"
          className="h-12 text-base placeholder:text-sm"
        />
        <Button
          size="lg"
          className="h-12 w-full px-6 sm:w-auto"
          onClick={() => (url.trim() ? handleSearch() : void pasteFromClipboard())}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : url.trim() ? <Search /> : <ClipboardPaste />}
          <span>{url.trim() ? "Fetch" : info || unavailable ? "Paste Another" : "Paste & Fetch"}</span>
        </Button>
      </motion.div>

      <PlatformIcons compact={loading || !!info} />

      <TurnstileWidget />

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl"
          >
            <Card className="card-texture overflow-hidden rounded-md border-0 p-0 shadow-xs">
              <div className="flex gap-4 p-4">
                <Skeleton className="h-24 w-40 rounded-md" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {info && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl"
          >
          <Card className="card-texture overflow-hidden rounded-md border-0 p-0 shadow-xs">
          <div className="relative z-10 flex flex-col gap-3 rounded-md p-4 sm:flex-row sm:gap-4">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt={info.title}
                className="h-40 w-full shrink-0 rounded-md object-cover sm:h-24 sm:w-40"
              />
            ) : (
              <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-md bg-muted sm:h-24 sm:w-40">
                {info.audioOnly ? (
                  <Music2 className="size-6 text-muted-foreground" />
                ) : (
                  <Video className="size-6 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-start gap-1">
              <p className="line-clamp-2 text-sm font-medium">{info.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {info.type === "images"
                  ? `${info.images?.length ?? 0} image${(info.images?.length ?? 0) === 1 ? "" : "s"}`
                  : info.type === "carousel"
                    ? [
                        info.carouselVideos?.length
                          ? `${info.carouselVideos.length} video${info.carouselVideos.length === 1 ? "" : "s"}`
                          : null,
                        info.images?.length
                          ? `${info.images.length} image${info.images.length === 1 ? "" : "s"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : [info.uploader && info.uploader !== "undefined" ? info.uploader : null, info.duration ? formatDuration(info.duration) : null]
                        .filter(Boolean)
                        .join(" · ")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {info.webpage_url && (
                  <Button variant="ghost" size="sm" asChild className="h-6 w-fit gap-1 px-2 text-xs text-muted-foreground">
                    <a href={safeHref(info.webpage_url)} target="_blank" rel="noopener noreferrer">
                      {detectPlatformLabel(info.webpage_url)}
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-fit gap-1 px-2 text-xs text-muted-foreground"
                  disabled={loading}
                  onClick={() => void handleSearch(fetchedUrl, { forceRefresh: true, rangeStart: info.range?.start, rangeEnd: info.range?.end })}
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </Button>
                {(() => {
                  // A stories result offers the way back to the profile (a profile shows its stories in its own tab).
                  const link = parseInstagramProfileLink(fetchedUrl);
                  if (!link || link.kind !== "stories") return null;
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-fit gap-1 px-2 text-xs text-muted-foreground"
                      disabled={loading}
                      onClick={() => void handleSearch(instagramProfileUrl(link.username))}
                    >
                      <User className="size-3" />
                      Profile
                    </Button>
                  );
                })()}
                {info.stored?.playlistPath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-fit gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => goToStoredPath(info.stored!.playlistPath!)}
                  >
                    <ListVideo className="size-3" />
                    View playlist
                  </Button>
                )}
                {info.fallbackUsed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-amber-500/40 px-1.5 text-[10px] leading-none font-normal text-amber-600 dark:text-amber-400"
                      >
                        <TriangleAlert className="size-3" />
                        Backup source
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56">
                      {info.type === "video" || info.type === "playlist"
                        ? "The main source is blocking us right now, so this uses a backup. Quality can be lower (usually up to 720p)."
                        : "The main source is blocking us right now, so this came from a backup. Some details may be missing."}
                    </TooltipContent>
                  </Tooltip>
                )}
                {info.stored?.validationFailed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] leading-none font-normal text-muted-foreground">
                        <Clock className="size-3" />
                        May be outdated
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56">
                      We couldn't re-check this video just now, so this is the last version we saw.
                    </TooltipContent>
                  </Tooltip>
                )}
                {(info.stored?.downloads ?? 0) > 0 && (
                  <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] leading-none font-normal text-muted-foreground">
                    <Download className="size-3" />
                    {info.stored!.downloads.toLocaleString()} {info.stored!.downloads === 1 ? "download" : "downloads"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {info.range && (
            <RangePicker
              range={info.range}
              disabled={loading}
              onLoad={(start, end) => void handleSearch(fetchedUrl, { rangeStart: start, rangeEnd: end })}
            />
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "video" | "audio" | "images" | "stories")}
            className="-mt-2 px-4 pb-4"
          >
            {info.type === "images" ? (
              <TabsList className="w-full">
                <TabsTrigger value="images" className="flex-1 gap-1.5">
                  <ImageIcon className="size-3.5" />
                  {(info.images?.length ?? 0) > 1 ? "Gallery" : "Picture"}
                </TabsTrigger>
              </TabsList>
            ) : info.type === "carousel" ? (
              <TabsList className="w-full">
                {(() => {
                  const videosTrigger = (info.carouselVideos?.length ?? 0) > 0 && (
                    <TabsTrigger key="video" value="video" className="flex-1 gap-1.5">
                      <Video className="size-3.5" /> Videos
                    </TabsTrigger>
                  );
                  const galleryTrigger = (info.images?.length ?? 0) > 0 && (
                    <TabsTrigger key="images" value="images" className="flex-1 gap-1.5">
                      <ImageIcon className="size-3.5" />
                      {(info.images?.length ?? 0) > 1 ? "Gallery" : "Picture"}
                    </TabsTrigger>
                  );
                  const storiesTrigger = stories && (
                    <TabsTrigger key="stories" value="stories" className="flex-1 gap-1.5">
                      {stories.status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <CirclePlay className="size-3.5" />}
                      Stories
                    </TabsTrigger>
                  );
                  // A profile lists Gallery, Videos, Stories; any other post or carousel keeps Videos first.
                  const isProfile = parseInstagramProfileLink(fetchedUrl)?.kind === "profile";
                  return isProfile ? [galleryTrigger, videosTrigger, storiesTrigger] : [videosTrigger, galleryTrigger, storiesTrigger];
                })()}
              </TabsList>
            ) : (
              !info.audioOnly && (
                <TabsList className="w-full">
                  {(() => {
                    const videoTrigger = (
                      <TabsTrigger key="video" value="video" className="flex-1 gap-1.5">
                        <Video className="size-3.5" /> Video (MP4)
                      </TabsTrigger>
                    );
                    const audioTrigger = (
                      <TabsTrigger key="audio" value="audio" className="flex-1 gap-1.5">
                        <Music2 className="size-3.5" /> Audio (MP3)
                      </TabsTrigger>
                    );
                    // The default tab shows first, matching which one opens after Fetch.
                    return prefs.defaultMode === "audio"
                      ? [audioTrigger, videoTrigger]
                      : [videoTrigger, audioTrigger];
                  })()}
                </TabsList>
              )
            )}

            {info.type === "images" ? (
              <TabsContent value="images" className="flex flex-col gap-2 pt-3">
                <ImageFormatList
                  info={info}
                  downloadStatus={downloadStatus}
                  progress={progress}
                  runImageDownload={runImageDownload}
                />
              </TabsContent>
            ) : info.type === "carousel" ? (
              <>
                {(info.carouselVideos?.length ?? 0) > 0 && (
                  <TabsContent value="video" className="flex flex-col gap-2 pt-3">
                    <CarouselVideoList
                      info={info}
                      downloadStatus={downloadStatus}
                      progress={progress}
                      runCarouselVideoDownload={runCarouselVideoDownload}
                    />
                  </TabsContent>
                )}
                {(info.images?.length ?? 0) > 0 && (
                  <TabsContent value="images" className="flex flex-col gap-2 pt-3">
                    <ImageFormatList
                      info={info}
                      downloadStatus={downloadStatus}
                      progress={progress}
                      runImageDownload={runImageDownload}
                    />
                  </TabsContent>
                )}
                {stories && (
                  <TabsContent value="stories" className="flex flex-col gap-2 pt-3">
                    {stories.status === "loading" || !stories.info ? (
                      <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Looking for stories…
                      </p>
                    ) : (
                      <>
                        {(stories.info.carouselVideos?.length ?? 0) > 0 && (
                        <CarouselVideoList
                          info={stories.info}
                          keyPrefix="story-"
                          downloadStatus={downloadStatus}
                          progress={progress}
                          runCarouselVideoDownload={(formatId, key) =>
                            runCarouselVideoDownload(formatId, key, instagramStoriesUrl(stories.username), stories.info?.title)
                          }
                        />
                        )}
                        {(stories.info.images?.length ?? 0) > 0 && (
                        <ImageFormatList
                          info={stories.info}
                          keyPrefix="story-"
                          downloadStatus={downloadStatus}
                          progress={progress}
                          runImageDownload={runImageDownload}
                        />
                        )}
                      </>
                    )}
                  </TabsContent>
                )}
              </>
            ) : (
              <>
                {!info.audioOnly && (
                  <TabsContent value="video" className="flex flex-col gap-2 pt-3">
                    {info.type === "playlist" ? (
                      <PlaylistFormatList
                        mode="video"
                        info={info}
                        prefs={prefs}
                        downloadStatus={downloadStatus}
                        progress={progress}
                        runDownload={runDownload}
                        guardedStart={guardedStart}
                      />
                    ) : (
                      <VideoFormatList
                        info={info}
                        prefs={prefs}
                        downloadStatus={downloadStatus}
                        progress={progress}
                        runDownload={runDownload}
                        guardedStart={guardedStart}
                        bestOnly={prefs.autoDownloadBest}
                      />
                    )}
                  </TabsContent>
                )}

                <TabsContent value="audio" className="flex flex-col gap-2 pt-3">
                  {info.type === "playlist" ? (
                    <PlaylistFormatList
                      mode="audio"
                      info={info}
                      prefs={prefs}
                      downloadStatus={downloadStatus}
                      progress={progress}
                      runDownload={runDownload}
                      guardedStart={guardedStart}
                      playAudio={playAudio}
                      previewLoading={previewLoading}
                      previewProgress={previewProgress}
                    />
                  ) : (
                    <AudioFormatList
                      info={info}
                      prefs={prefs}
                      downloadStatus={downloadStatus}
                      progress={progress}
                      runDownload={runDownload}
                      guardedStart={guardedStart}
                      playAudio={playAudio}
                      previewLoading={previewLoading}
                      previewProgress={previewProgress}
                      bestOnly={prefs.autoDownloadBest}
                    />
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
          </Card>
          </motion.div>
        )}

        {unavailable && !loading && (
          <UnavailableCard
            tombstone={unavailable}
            retrying={loading}
            onRetry={() => void handleSearch(fetchedUrl || unavailable.sourceUrl || "", { forceRefresh: true })}
          />
        )}
      </AnimatePresence>
      <GithubFooter />
    </div>
    </div>
  );
}

/** Renders one FormatRow per playlist entry, inside the same Video/Audio
 * tabs a single video uses — so a playlist behaves exactly like a single
 * video that happens to have many "best available quality" rows instead
 * of many resolution options. Each row shows the entry's own thumbnail
 * (rather than a generic icon) since, unlike a single video's format
 * list, every row here is a different item. */
function PlaylistFormatList({
  mode,
  info,
  prefs,
  downloadStatus,
  progress,
  runDownload,
  guardedStart,
  playAudio,
  previewLoading,
  previewProgress,
}: {
  mode: "video" | "audio";
  info: MediaInfo;
  prefs: ReturnType<typeof usePreferences>["prefs"];
  downloadStatus: Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">;
  /** 0–100 while a key is "preparing" — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress: Record<FormatKey, number>;
  runDownload: (
    mode: "video" | "audio",
    format_id?: string,
    mediaOverride?: MediaInfo,
    formatMeta?: MediaFormat,
    urlOverride?: string,
    keyOverride?: FormatKey
  ) => void;
  guardedStart: (
    mode: "video" | "audio",
    key: FormatKey,
    status: "queued" | "preparing" | "ready" | "downloaded" | undefined,
    start: () => void,
    sizeLabel?: string
  ) => void;
  playAudio?: (
    format_id: string | undefined,
    media: MediaInfo,
    formatMeta?: MediaFormat,
    keyOverride?: FormatKey,
    urlOverride?: string
  ) => void;
  previewLoading?: Record<FormatKey, boolean>;
  previewProgress?: Record<FormatKey, number>;
}) {
  const entries = info.entries ?? [];
  const [visibleCount, setVisibleCount] = useState(25);
  const visibleEntries = entries.slice(0, visibleCount);

  return (
    <>
      {visibleEntries.map((entry) => {
        const entryMedia: MediaInfo = {
          ...info,
          id: entry.id,
          title: entry.title,
          uploader: entry.uploader ?? info.uploader,
          duration: entry.duration ?? 0,
          webpage_url: entry.url,
          videoFormats: [],
          audioFormats: [],
          type: "video",
          entries: undefined,
        };
        const key = keyFor(mode, entry.id);
        const name = `${styledBaseName(prefs.filenameStyle, {
          mode,
          title: entry.title,
          uploader: entryMedia.uploader,
          extractor: info.extractor,
          videoId: entry.id,
          resolution: null,
          vcodec: null,
        })}.${mode === "audio" ? "mp3" : "mp4"}`;

        return (
          <FormatRow
            key={entry.id}
            label={entry.title}
            sub={entry.uploader ?? name}
            durationLabel={entry.duration != null ? formatDuration(entry.duration) : undefined}
            thumbnail={entry.thumbnail}
            dense
            mediaType={mode}
            status={downloadStatus[key]}
            progress={progress[key]}
            onDownload={() =>
              guardedStart(mode, key, downloadStatus[key], () =>
                runDownload(mode, undefined, entryMedia, undefined, entry.url, key)
              )
            }
            playKey={mode === "audio" ? key : undefined}
            onPlayAudio={mode === "audio" ? () => playAudio?.(undefined, entryMedia, undefined, key, entry.url) : undefined}
            previewLoading={previewLoading?.[key]}
            previewProgress={previewProgress?.[key]}
          />
        );
      })}
      {visibleCount < entries.length && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 w-full text-xs"
          onClick={() => setVisibleCount((count) => Math.min(entries.length, count + 25))}
        >
          Show more ({entries.length - visibleCount} left)
        </Button>
      )}
    </>
  );
}

/** One row per video from a multi-video Instagram carousel. Each video is
 * already a fully-muxed direct CDN file (no per-video quality picker, no
 * separate audio track to extract) — one click downloads it as-is, same
 * one-button pattern as ImageFormatList below. */
function CarouselVideoList({
  info,
  downloadStatus,
  progress,
  runCarouselVideoDownload,
  keyPrefix = "",
}: {
  keyPrefix?: string;
  info: MediaInfo;
  downloadStatus: Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">;
  /** 0–100 while a key is "preparing" — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress: Record<FormatKey, number>;
  runCarouselVideoDownload: (formatId: string, key: FormatKey) => void;
}) {
  const videos = info.carouselVideos ?? NO_ITEMS;

  return (
    <ProgressiveList items={videos}>
      {(visibleVideos) => visibleVideos.map((video, index) => {
        const key = keyFor("video", `${keyPrefix}carousel-${video.id}`);
        const title = `${sanitizeFilenameLocal(info.title)}-${index + 1}`;
        return (
          <FormatRow
            key={video.id}
            label={`Video ${index + 1} · ${video.ext.toUpperCase()}`}
            sub={title}
            sizeLabel={formatBytes(video.filesize) ?? undefined}
            durationLabel={video.duration != null ? formatDuration(video.duration) : undefined}
            thumbnail={video.thumbnail}
            videoPreviewUrl={video.previewUrl}
            thumbnailSize="lg"
            dense
            mediaType="video"
            status={downloadStatus[key]}
            progress={progress[key]}
            onDownload={() => runCarouselVideoDownload(video.formatId, key)}
          />
        );
      })}
    </ProgressiveList>
  );
}

/** Same idea as PlaylistFormatList but for an Instagram image/carousel
 * gallery — one FormatRow per image, thumbnail as the icon, no audio
 * preview since there's nothing to play. */
function ImageFormatList({
  info,
  downloadStatus,
  progress,
  runImageDownload,
  keyPrefix = "",
}: {
  keyPrefix?: string;
  info: MediaInfo;
  downloadStatus: Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">;
  /** 0–100 while a key is "preparing" — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress: Record<FormatKey, number>;
  runImageDownload: (imageUrl: string, key: FormatKey, title: string) => void;
}) {
  const images = info.images ?? NO_ITEMS;

  return (
    <ProgressiveList items={images}>
      {(visibleImages) => visibleImages.map((image, index) => {
        const key = keyFor("video", `${keyPrefix}img-${index}`);
        const title = `${sanitizeFilenameLocal(info.title)}-${index + 1}`;
        return (
          <FormatRow
            key={`${index}-${image.url}`}
            label={image.ext ? `Image ${index + 1} · ${image.ext.toUpperCase()}` : `Image ${index + 1}`}
            sub={title}
            sizeLabel={formatBytes(image.filesize) ?? undefined}
            thumbnail={image.thumbnail}
            thumbnailSize="lg"
            dense
            mediaType="video"
            status={downloadStatus[key]}
            progress={progress[key]}
            doneLabel="Saved"
            onDownload={() => runImageDownload(image.url, key, title)}
          />
        );
      })}
    </ProgressiveList>
  );
}

/** Local, dependency-free filename sanitizer for image download titles —
 * mirrors the server's own but keeps this component independent of the
 * styledBaseName pipeline built for video/audio naming conventions. */
function sanitizeFilenameLocal(name: string) {
  const cleaned = Array.from(name || "", (ch) => (ch.charCodeAt(0) < 32 || /[\\/:*?"<>|]/.test(ch) ? "_" : ch)).join("");
  return cleaned.slice(0, 100).trim() || "download";
}

const LARGE_FILE_BYTES = 200 * 1024 * 1024;
function isLikelyLargeFile(format: MediaFormat): boolean {
  if (format.filesize != null) return format.filesize >= LARGE_FILE_BYTES;
  return videoQualityBadge(format.height).tier === "top";
}

function warnIfLargeFile(format: MediaFormat): void {
  if (!isLikelyLargeFile(format)) return;
  const size = sizeLabelFor(format.filesize, format.filesizeApprox);
  toast(`Large file${size ? ` (${size})` : ""} — this may take a while to prepare. Please be patient.`, {
    icon: "⏳",
    duration: 6000,
  });
}

function VideoFormatList({
  info,
  prefs,
  downloadStatus,
  progress,
  runDownload,
  guardedStart,
  bestOnly = false,
}: {
  info: MediaInfo;
  prefs: ReturnType<typeof usePreferences>["prefs"];
  downloadStatus: Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">;
  /** 0–100 while a key is "preparing" — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress: Record<FormatKey, number>;
  runDownload: (mode: "video" | "audio", format_id?: string, mediaOverride?: MediaInfo, formatMeta?: MediaFormat) => void;
  guardedStart: (
    mode: "video" | "audio",
    key: FormatKey,
    status: "queued" | "preparing" | "ready" | "downloaded" | undefined,
    start: () => void,
    sizeLabel?: string
  ) => void;
  bestOnly?: boolean;
}) {
  const nameFor = (f?: MediaFormat) =>
    `${styledBaseName(prefs.filenameStyle, {
      mode: "video",
      title: info.title,
      uploader: info.uploader,
      extractor: info.extractor,
      videoId: info.id,
      resolution: f?.resolution ?? null,
      vcodec: f?.vcodec ?? null,
    })}.mp4`;
  // The "★ Best" badge always marks the true highest-quality pick (info.videoFormats' own first entry,
  // its default order), regardless of the size sort below reordering what's displayed underneath it.
  const bestFormatId = info.videoFormats[0]?.format_id;
  // bestOnly (auto-download-best) always means the true best quality pick, whatever the display sort below
  // would otherwise put first — the two preferences are about different things and shouldn't fight.
  const listedFormats = videoRows(info.videoFormats, { bySize: prefs.sortVideoBySmallestSize, bestOnly });

  return (
    <>
      {info.videoFormats.length === 0 && (
        <FormatRow
          label="Best available quality"
          sub={nameFor()}
          mediaType="video"
          status={downloadStatus[keyFor("video")]}
          progress={progress[keyFor("video")]}
          onDownload={() =>
            guardedStart("video", keyFor("video"), downloadStatus[keyFor("video")], () => runDownload("video"))
          }
        />
      )}
      {listedFormats.map((f) => {
        // The row names the quality only; codec notes live in the details dialog, not on the card.
        const resLabel = f.resolution ?? "Original";
        const key = keyFor("video", f.format_id);
        const sizeLabel = sizeLabelFor(f.filesize, f.filesizeApprox);
        return (
        <FormatRow
          key={f.format_id}
          label={`${resLabel} · ${f.ext.toUpperCase()}`}
          sub={nameFor(f)}
          sizeLabel={sizeLabel}
          quality={videoQualityBadge(f.height)}
          format={f}
          best={f.format_id === bestFormatId}
          recommended={resLabel === "Original" && f.format_id !== bestFormatId}
          mediaType="video"
          status={downloadStatus[key]}
          progress={progress[key]}
          onDownload={() =>
            guardedStart(
              "video",
              key,
              downloadStatus[key],
              () => {
                warnIfLargeFile(f);
                runDownload("video", f.format_id, undefined, f);
              },
              sizeLabel
            )
          }
        />
        );
      })}
    </>
  );
}

function AudioFormatList({
  info,
  prefs,
  downloadStatus,
  progress,
  runDownload,
  guardedStart,
  playAudio,
  previewLoading,
  previewProgress,
  bestOnly = false,
}: {
  info: MediaInfo;
  prefs: ReturnType<typeof usePreferences>["prefs"];
  downloadStatus: Record<FormatKey, "queued" | "preparing" | "ready" | "downloaded">;
  /** 0–100 while a key is "preparing" — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress: Record<FormatKey, number>;
  runDownload: (mode: "video" | "audio", format_id?: string, mediaOverride?: MediaInfo, formatMeta?: MediaFormat) => void;
  guardedStart: (
    mode: "video" | "audio",
    key: FormatKey,
    status: "queued" | "preparing" | "ready" | "downloaded" | undefined,
    start: () => void,
    sizeLabel?: string
  ) => void;
  playAudio: (format_id: string | undefined, media: MediaInfo, formatMeta?: MediaFormat) => void;
  previewLoading: Record<FormatKey, boolean>;
  previewProgress: Record<FormatKey, number>;
  bestOnly?: boolean;
}) {
  // The server proxies the original audio codec by default (no re-encode) —
  // only an explicit MP3 pick would transcode. Preview the extension that
  // will actually land on disk instead of always promising ".mp3".
  const nameFor = (ext?: string) =>
    `${styledBaseName(prefs.filenameStyle, {
      mode: "audio",
      title: info.title,
      uploader: info.uploader,
      extractor: info.extractor,
      videoId: info.id,
    })}.${ext || "m4a"}`;
  // The extension hint for "Best quality audio" matches the server's own best pick (see bestAudioFormat),
  // regardless of the compatibility sort below — that toggle only reorders the list underneath.
  const bestAudio = bestAudioFormat(info.audioFormats);
  const bestExt = bestAudio?.ext;
  const bestLabel = ["Best audio", formatBitrate(bestAudio?.abr ?? null), bestExt?.toUpperCase()].filter(Boolean).join(" · ");
  const bestSize = bestAudio ? sizeLabelFor(bestAudio.filesize, bestAudio.filesizeApprox) : undefined;
  const listedFormats = audioRows(info.audioFormats, { byCompatibility: prefs.sortAudioByCompatibility });

  return (
    <>
      <FormatRow
        label={bestLabel}
        sub={nameFor(bestExt)}
        sizeLabel={bestSize}
        best
        mediaType="audio"
        status={downloadStatus[keyFor("audio")]}
        progress={progress[keyFor("audio")]}
        onDownload={() =>
          guardedStart("audio", keyFor("audio"), downloadStatus[keyFor("audio")], () => runDownload("audio"))
        }
        playKey={keyFor("audio")}
        onPlayAudio={() => playAudio(undefined, info)}
        previewLoading={previewLoading[keyFor("audio")]}
        previewProgress={previewProgress[keyFor("audio")]}
      />
      {!bestOnly && listedFormats.map((f) => {
        const key = keyFor("audio", f.format_id);
        const sizeLabel = sizeLabelFor(f.filesize, f.filesizeApprox);
        return (
        <FormatRow
          key={f.format_id}
          label={[formatBitrate(f.abr) ?? (f.note && !/^converted/i.test(f.note) ? f.note : null), f.ext.toUpperCase()].filter(Boolean).join(" · ")}
          sub={nameFor(f.ext)}
          sizeLabel={sizeLabel}
          quality={audioQualityBadge(f.abr)}
          format={f}
          mediaType="audio"
          status={downloadStatus[key]}
          progress={progress[key]}
          onDownload={() =>
            guardedStart(
              "audio",
              key,
              downloadStatus[key],
              () => runDownload("audio", f.format_id, undefined, f),
              sizeLabel
            )
          }
          playKey={key}
          onPlayAudio={() => playAudio(f.format_id, info, f)}
          previewLoading={previewLoading[key]}
          previewProgress={previewProgress[key]}
        />
        );
      })}
    </>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FormatRow({
  label,
  sub,
  sizeLabel,
  durationLabel,
  quality,
  best,
  recommended,
  mediaType,
  status,
  progress,
  onDownload,
  playKey,
  onPlayAudio: onPlayAudioRequested,
  previewLoading,
  format,
  thumbnail,
  videoPreviewUrl,
  dense,
  thumbnailSize = "sm",
  selected,
  onToggleSelect,
  doneLabel = "Started",
}: {
  label: string;
  sub?: string;
  sizeLabel?: string;
  durationLabel?: string;
  quality?: { label: string; tier: "top" | "high" | "mid" | "low" };
  best?: boolean;
  /** The source's own untouched file: always plays, but its real resolution is unknown, so it keeps this badge
   * instead of competing with the true highest-quality pick for "★ Best". */
  recommended?: boolean;
  mediaType?: "video" | "audio";
  status?: "queued" | "preparing" | "ready" | "downloaded";
  /** 0–100 while `status === "preparing"` — paced by simulateProgress; the backend never reports a byte count for this path. */
  progress?: number;
  onDownload: () => void;
  playKey?: string;
  onPlayAudio?: () => void;
  previewLoading?: boolean;
  previewProgress?: number;
  format?: MediaFormat;
  /** Playlist/gallery entries show their own thumbnail here instead of the
   * generic video/audio icon, since every row in a single-video's format
   * list is the same media and doesn't need one, but every row in a
   * playlist or image gallery is a *different* item. */
  thumbnail?: string | null;
  /** No thumbnail from the backend: the browser shows this video's first frame instead (metadata only, nothing plays). */
  videoPreviewUrl?: string;
  /** Playlist/gallery rows: single-line truncated title instead of the
   * free-wrapping label a single video's short format label uses, so a
   * long video title doesn't blow up the row's height. */
  dense?: boolean;
  /** Image gallery rows: the thumbnail *is* the content being downloaded
   * (not just a visual aid next to format info like it is for video/audio),
   * so it gets noticeably more room than the default icon-sized thumbnail. */
  thumbnailSize?: "sm" | "lg";
  /** Gallery/carousel rows only: lets the row be selected for a partial zip
   * without a visible checkbox — Ctrl/Cmd(+Shift)-clicking the row (outside
   * its buttons/links) toggles it, matching file-manager convention.
   * `undefined` (not `false`) means "not selectable at all", so a
   * single-video format list and playlist rows never react to modifier
   * clicks. */
  selected?: boolean;
  onToggleSelect?: (e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void;
  /** Shown on the button once done: "Started" for a download handed to the browser, "Saved" for an image. */
  doneLabel?: string;
}) {
  // Audio previews are switched off for now: most audio is M4A/WebM, which is not a plain MP3 to play.
  const onPlayAudio = AUDIO_PREVIEW_ENABLED ? onPlayAudioRequested : undefined;
  const isDone = status === "downloaded";
  const isPlaying = useIsPlaying(playKey ?? "");
  const { currentTime, duration } = useAudioProgress(playKey ?? "");
  // Collapses back to the plain row the moment playback is paused — no
  // point keeping the wave/time controls open for a paused track.
  const expanded = !!(playKey && (isPlaying || previewLoading));

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border px-3 py-2 ${
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
      }`}
      onClick={
        onToggleSelect
          ? (e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;
              // Modifier-clicking the Download/Play button (or any link)
              // should still just do that — only the rest of the row toggles
              // selection, so a ctrl-click doesn't also kick off a download.
              if ((e.target as HTMLElement).closest("button, a")) return;
              e.preventDefault();
              onToggleSelect({ ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey });
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5 sm:min-w-0 sm:flex-1">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className={`${thumbnailSize === "lg" ? "size-14" : "size-9"} shrink-0 rounded-md object-cover`}
            />
          ) : videoPreviewUrl ? (
            <video
              src={`${videoPreviewUrl}#t=1`}
              preload="metadata"
              muted
              playsInline
              aria-hidden="true"
              tabIndex={-1}
              className={`${thumbnailSize === "lg" ? "size-14" : "size-9"} pointer-events-none shrink-0 rounded-md bg-muted object-cover`}
            />
          ) : (
            <div
              className={`flex ${thumbnailSize === "lg" ? "size-14" : "size-9"} shrink-0 items-center justify-center rounded-md bg-muted`}
            >
              {mediaType === "audio" ? (
                <Music2 className="size-4 text-muted-foreground" />
              ) : (
                <Video className="size-4 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1 sm:max-w-xs">
            <div className="flex min-w-0 items-center gap-1.5">
              {/* A long title shrinks with an ellipsis so the badge stays on the same line. */}
              <span title={label} className={dense ? "min-w-0 flex-1 truncate text-xs font-medium" : "min-w-0 truncate text-sm"}>
                {label}
              </span>
              {durationLabel && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 gap-1 px-1.5 text-[10px] leading-none font-normal text-muted-foreground"
                >
                  <Clock className="size-3" />
                  {durationLabel}
                </Badge>
              )}
              {sizeLabel && (
                <Badge
                  variant="outline"
                  className="hidden h-5 shrink-0 gap-1 px-1.5 text-[10px] leading-none font-normal text-muted-foreground sm:inline-flex"
                >
                  <HardDrive className="size-3" />
                  {sizeLabel}
                </Badge>
              )}
              {best ? (
                <Badge className={`h-5 shrink-0 py-0 px-1.5 text-[10px] leading-none font-semibold ${BEST_BADGE_CLASS}`}>
                  ★ Best
                </Badge>
              ) : recommended ? (
                <Badge className={`h-5 shrink-0 py-0 px-1.5 text-[10px] leading-none font-semibold ${RECOMMENDED_BADGE_CLASS}`}>
                  Recommended
                </Badge>
              ) : (
                quality && (
                  <Badge className={`h-5 shrink-0 py-0 px-1.5 text-[10px] leading-none font-semibold ${QUALITY_BADGE_CLASSES[quality.tier]}`}>
                    {quality.label}
                  </Badge>
                )
              )}
              {/* On mobile this sits at the end of the title line instead of
                  down by the Download button; the desktop copy (hidden here,
                  shown next to Download) covers >=sm. */}
              {format && (
                <span className="ml-auto sm:hidden">
                  <FormatDetailsDialog format={format} />
                </span>
              )}
            </div>
            {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:shrink-0 sm:items-center sm:justify-end">
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
          {onPlayAudio && !expanded && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onPlayAudio}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="shrink-0"
            >
              {previewLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
          {(() => {
            const downloadButton = (
              <DownloadProgressButton
                state={
                  isDone
                    ? "done"
                    : status === "ready"
                      ? "ready"
                      : status === "preparing"
                        ? "preparing"
                        : status === "queued"
                          ? "queued"
                          : "idle"
                }
                progress={progress}
                onClick={onDownload}
                sizeLabel={sizeLabel}
                doneLabel={doneLabel}
                className="w-full sm:w-auto"
              />
            );

            // Only explain states that aren't already obvious from the button's own label.
            const tooltipText = isDone
              ? "Click to download again"
              : status === "ready"
                ? "Ready — click to save"
                : status === "preparing"
                  ? "Click to stop"
                  : status === "queued"
                    ? "Waiting for a free slot — click to remove from queue"
                    : null;

            if (!tooltipText) return <span className="min-w-0 flex-1 sm:flex-none">{downloadButton}</span>;

            return (
              <Tooltip>
                {/* A plain span (not the disabled button) is the trigger, so the tooltip still shows on hover while disabled. */}
                <TooltipTrigger asChild>
                  <span className="inline-flex min-w-0 flex-1 sm:flex-none">{downloadButton}</span>
                </TooltipTrigger>
                <TooltipContent>{tooltipText}</TooltipContent>
              </Tooltip>
            );
          })()}
          {format && (
            <span className="hidden sm:inline-flex">
              <FormatDetailsDialog format={format} />
            </span>
          )}
          </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={onPlayAudio}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="shrink-0"
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </Button>
              <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                {formatTime(currentTime)}
              </span>
              <div className="min-w-0 flex-1">
                <AudioWave
                  active={isPlaying}
                  progress={duration ? currentTime / duration : 0}
                  onSeek={(f) => playKey && seekTo(playKey, f)}
                />
              </div>
              <span className="flex w-8 shrink-0 items-center justify-end text-[10px] tabular-nums text-muted-foreground">
                {previewLoading ? <Loader2 className="size-3.5 animate-spin" /> : formatTime(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
