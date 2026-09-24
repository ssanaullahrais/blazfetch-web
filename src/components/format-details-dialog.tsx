import { AudioLines, CircleHelp, FileType, Film, Gauge, HardDrive, Maximize2, Tag, Volume2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBitrate, formatBytes } from "@/lib/api";

/** The subset of a format's technical detail this dialog needs — shared
 * shape between a live `MediaFormat` (home page, picking a format to
 * download) and a persisted download_events row (Library, Dashboard, admin
 * Media Library), which uses different field names for a couple of these
 * (filesizeBytes vs filesize, formatNote vs note) since it's a DB row, not
 * the yt-dlp-shaped object. Callers normalize to this shape. */
export type FormatDetails = {
  ext: string | null;
  resolution?: string | null;
  fps?: number | null;
  note?: string | null;
  vcodec?: string | null;
  acodec?: string | null;
  tbr?: number | null;
  abr?: number | null;
  filesize?: number | null;
  filesizeApprox?: boolean | null;
};

/** One shared "Format details" dialog — the exact technical breakdown
 * (file size, format, resolution, frame rate, note, codecs, bitrates) shown
 * the same way everywhere a specific downloaded/downloadable format shows
 * up: the homepage's format picker, the user's Library/Recent downloads,
 * and the admin Media Library. A single source of truth so all of them
 * read identically instead of each page inventing its own layout. */
export function FormatDetailsDialog({ format, trigger }: { format: FormatDetails; trigger?: React.ReactNode }) {
  const rows: { icon: typeof FileType; label: string; value: string }[] = [
    {
      icon: HardDrive,
      label: "File size",
      value:
        format.filesize != null
          ? `${formatBytes(format.filesize)}${format.filesizeApprox ? " (estimated)" : ""}`
          : "—",
    },
    { icon: FileType, label: "Format", value: format.ext ? format.ext.toUpperCase() : "—" },
    { icon: Maximize2, label: "Resolution", value: format.resolution ?? "—" },
    { icon: Gauge, label: "Frame rate", value: format.fps ? `${format.fps} fps` : "—" },
    { icon: Tag, label: "Note", value: format.note ?? "—" },
    { icon: Film, label: "Video codec", value: format.vcodec ?? "—" },
    { icon: Volume2, label: "Audio codec", value: format.acodec ?? "—" },
    { icon: Zap, label: "Bitrate", value: formatBitrate(format.tbr ?? null) ?? "—" },
    { icon: AudioLines, label: "Audio bitrate", value: formatBitrate(format.abr ?? null) ?? "—" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="icon-xs" variant="ghost" aria-label="Format details" className="shrink-0">
            <CircleHelp className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="min-w-0 gap-4 overflow-hidden p-0 pt-6">
        <DialogHeader className="mx-0 mt-0 min-w-0 border-b-0 bg-transparent p-0 px-6">
          <DialogTitle>Format details</DialogTitle>
          <DialogDescription>Full technical info for this format.</DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col divide-y divide-border border-t">
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 items-center justify-between gap-3 px-6 py-2.5 text-sm">
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-muted-foreground">
                <row.icon className="size-3.5 shrink-0" />
                {row.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-right font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
