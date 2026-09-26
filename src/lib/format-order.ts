import type { MediaFormat } from "@/lib/api";

/** How many video / audio formats a result lists. */
export const VIDEO_ROWS = 8;
export const AUDIO_ROWS = 5;

/** On a narrow (phone-width) screen, a video format flagged incompatible ("may not play everywhere" — VP9/AV1/etc.,
 * see MediaFormat.compatible) keeps its card, but its Download button is swapped for a disabled-looking "Desktop
 * only" one that explains why on click, instead of letting a download start that likely won't play — a wide
 * (desktop) screen is never affected, since that's rarely a real problem there. Default on; set
 * VITE_DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE=false to download normally everywhere, no special handling. */
export const DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE = import.meta.env.VITE_DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE !== "false";

/**
 * Which of the listed formats' rows should show that disabled "Desktop only" state — see
 * DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE. `isPhone` comes from the caller (see useIsMobile) since screen width can
 * change at runtime, unlike a device's UA. If every listed format is incompatible, none are disabled: leaving
 * every row unusable would strand a phone visitor with nothing to download at all, so they're better off
 * attempting the true best quality (which may still just work) than seeing an all-"Desktop only" list.
 */
export function phoneIncompatibleFormatIds(formats: MediaFormat[], isPhone: boolean): Set<string> {
  if (!isPhone || !DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE || formats.length === 0) return new Set();
  const incompatible = formats.filter((f) => f.compatible === false);
  if (incompatible.length === formats.length) return new Set();
  return new Set(incompatible.map((f) => f.format_id));
}

/** Smallest file first. Sizes include estimates (bitrate x duration, see toVideoFormat); rows with no size at all
 * go after the others, smallest resolution first, since a lower resolution is the smaller file. */
function sortBySize(formats: MediaFormat[]): MediaFormat[] {
  return [...formats].sort((a, b) => {
    if (a.filesize != null && b.filesize != null) return a.filesize - b.filesize || (a.height ?? 0) - (b.height ?? 0);
    if (a.filesize != null) return -1;
    if (b.filesize != null) return 1;
    return (a.height ?? Number.MAX_SAFE_INTEGER) - (b.height ?? Number.MAX_SAFE_INTEGER);
  });
}

const AUDIO_COMPATIBILITY_RANK: Record<string, number> = { mp3: 0, webm: 1 };

/** MP3 first, then WEBM, then everything else, each tier still highest-bitrate-first: the source's own
 * quality-first order doesn't always put the most broadly playable format at the top. */
function sortByCompatibility(formats: MediaFormat[]): MediaFormat[] {
  return [...formats].sort((a, b) => {
    const rankDiff = (AUDIO_COMPATIBILITY_RANK[a.ext.toLowerCase()] ?? 2) - (AUDIO_COMPATIBILITY_RANK[b.ext.toLowerCase()] ?? 2);
    return rankDiff !== 0 ? rankDiff : (b.abr ?? 0) - (a.abr ?? 0);
  });
}

/** Below this, a phone-safe (H.264) format is not worth choosing over a sharper one that needs re-encoding.
 * Mirrors the backend's own MIN_HEIGHT_TO_PREFER_COMPATIBLE in pickBestVideoFormat. */
const MIN_HEIGHT_TO_PREFER_COMPATIBLE = 720;

/**
 * The "★ Best" pick, matching the backend's own default (no formatId sent) instead of blindly the highest
 * resolution: a VP9/AV1-only source at the top (common at 1440p/4K) needs the server to fully download and
 * transcode it before anything can play, which can be minutes of work — or worse, for some YouTube manifests,
 * fail to complete at all — while an H.264 copy at 720p or higher plays instantly with no re-encode. `formats` is
 * already sorted highest-resolution first (see videoRows), so this is "the first compatible one, unless nothing
 * compatible reaches 720p, in which case the true highest quality wins".
 */
export function bestVideoFormat(formats: MediaFormat[]): MediaFormat | undefined {
  const compatible = formats.find((f) => f.compatible);
  if (compatible && (compatible.height ?? 0) >= MIN_HEIGHT_TO_PREFER_COMPATIBLE) return compatible;
  return formats[0];
}

/** The source's own untouched file has no parsed resolution, so it is shown as "Original" (see unsizedLabel in
 * api.ts) rather than a height. It always plays (no merge/remux needed) even when it isn't the highest quality,
 * which earns it the top spot regardless of the size sort below. */
function pinOriginalFirst(formats: MediaFormat[]): MediaFormat[] {
  // Mirrors the row's own display fallback (resolution ?? "Original") so what's pinned matches what's labeled.
  const isOriginal = (f: MediaFormat): boolean => (f.resolution ?? "Original") === "Original";
  const original = formats.filter(isOriginal);
  if (original.length === 0) return formats;
  return [...original, ...formats.filter((f) => !isOriginal(f))];
}

/**
 * The video rows a result shows, in display order. The sort settings only reorder the rows the list offers anyway
 * (the highest qualities); they never swap them for others, which sorting everything first and then cutting the
 * list would do (the 8 smallest are 96p, 144p, ...). `bestOnly` is the single best-quality row.
 */
export function videoRows(formats: MediaFormat[], options: { bySize: boolean; bestOnly?: boolean }): MediaFormat[] {
  if (options.bestOnly) return formats.slice(0, 1);
  const shown = formats.slice(0, VIDEO_ROWS);
  return pinOriginalFirst(options.bySize ? sortBySize(shown) : shown);
}

/** The audio rows a result shows, in display order (see videoRows). */
export function audioRows(formats: MediaFormat[], options: { byCompatibility: boolean }): MediaFormat[] {
  const shown = formats.slice(0, AUDIO_ROWS);
  return options.byCompatibility ? sortByCompatibility(shown) : shown;
}

const isPhoneSafeAudio = (f: MediaFormat): boolean => ["mp3", "m4a"].includes(f.ext.toLowerCase()) || /^(mp4a|aac)/i.test(f.acodec ?? "");

/** The track the server picks for "best" audio: the top bitrate, unless an AAC/MP3 track is within 80% of it
 * (it sounds the same and plays on every phone). Mirrors pickBestAudioFormat in the backend. */
export function bestAudioFormat(formats: MediaFormat[]): MediaFormat | undefined {
  const sorted = [...formats].sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));
  const top = sorted[0];
  const phoneSafe = sorted.find(isPhoneSafeAudio);
  return top && phoneSafe && (phoneSafe.abr ?? 0) >= (top.abr ?? 0) * 0.8 ? phoneSafe : top;
}
