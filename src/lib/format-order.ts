import type { MediaFormat } from "@/lib/api";

/** How many video / audio formats a result lists. */
export const VIDEO_ROWS = 8;
export const AUDIO_ROWS = 5;

/** Smallest file size first. An unknown size (yt-dlp can't always report one up front for DASH/fragmented formats)
 * sorts last, since there's nothing to rank it against. */
function sortBySize(formats: MediaFormat[]): MediaFormat[] {
  return [...formats].sort((a, b) => {
    if (a.filesize == null && b.filesize == null) return 0;
    if (a.filesize == null) return 1;
    if (b.filesize == null) return -1;
    return a.filesize - b.filesize;
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

/**
 * The video rows a result shows, in display order. The sort settings only reorder the rows the list offers anyway
 * (the highest qualities); they never swap them for others, which sorting everything first and then cutting the
 * list would do (the 8 smallest are 96p, 144p, ...). `bestOnly` is the single best-quality row.
 */
export function videoRows(formats: MediaFormat[], options: { bySize: boolean; bestOnly?: boolean }): MediaFormat[] {
  if (options.bestOnly) return formats.slice(0, 1);
  const shown = formats.slice(0, VIDEO_ROWS);
  return options.bySize ? sortBySize(shown) : shown;
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
