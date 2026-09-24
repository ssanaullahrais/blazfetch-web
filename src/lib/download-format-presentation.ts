import { audioQualityBadge, formatBitrate, videoQualityBadge } from "@/lib/api";

export const QUALITY_BADGE_CLASSES: Record<string, string> = {
  top: "border-transparent bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-amber-950 shadow-sm shadow-amber-500/30",
  high: "border-transparent bg-gradient-to-r from-sky-400 to-blue-500 text-white",
  mid: "border-transparent bg-gradient-to-r from-teal-400 to-emerald-500 text-white",
  low: "border-transparent bg-muted text-muted-foreground",
};

export const BEST_BADGE_CLASS =
  "border-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-amber-950 shadow-sm shadow-amber-500/40";

/** The one rule that turns persisted format metadata into the same label and
 * quality tier used on the homepage, live jobs, Recent, Library, and admin. */
export function getDownloadFormatPresentation(row: {
  mediaType?: string | null;
  ext?: string | null;
  resolution?: string | null;
  formatNote?: string | null;
  abr?: number | null;
}) {
  const extension = (row.ext || (row.mediaType === "audio" ? "mp3" : row.mediaType === "image" ? "jpg" : "mp4")).toUpperCase();
  if (row.mediaType === "audio") {
    const bitrate = formatBitrate(row.abr ?? null) ?? row.formatNote ?? "Audio";
    return { label: `${bitrate} · ${extension}`, quality: row.abr != null ? audioQualityBadge(row.abr) : null };
  }
  const height = row.resolution ? Number(row.resolution.toLowerCase().split("x")[1]) : NaN;
  return {
    label: `${row.resolution || row.formatNote || (row.mediaType === "image" ? "Image" : "Best available")} · ${extension}`,
    quality: Number.isFinite(height) ? videoQualityBadge(height) : null,
  };
}
