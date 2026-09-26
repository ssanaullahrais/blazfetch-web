import { describe, expect, it } from "vitest"
import type { MediaFormat } from "@/lib/api"
import { audioRows, bestAudioFormat, videoRows } from "@/lib/format-order"

const fmt = (id: string, height: number | null, filesize: number | null, ext = "mp4", abr: number | null = null): MediaFormat => ({
  format_id: id,
  ext,
  resolution: height ? `${height}p` : null,
  height,
  fps: null,
  hasVideo: height != null,
  hasAudio: true,
  note: null,
  filesize,
  filesizeApprox: false,
  abr,
  tbr: null,
  vcodec: null,
  acodec: null,
})

// Highest quality first, as the API mapping hands them over: ten formats, so the list is cut to eight.
const video = [
  fmt("1080", 1080, null),
  fmt("960", 960, 193_000_000, "webm"),
  fmt("720", 720, 120_000_000),
  fmt("720w", 720, 82_000_000, "webm"),
  fmt("480", 480, 60_000_000),
  fmt("360", 360, 30_000_000),
  fmt("240", 240, 12_000_000),
  fmt("144", 144, 5_000_000),
  fmt("96", 96, 3_400_000, "webm"),
  fmt("160", 160, 6_800_000, "webm"),
]

describe("videoRows", () => {
  it("shows the eight highest qualities by default", () => {
    expect(videoRows(video, { bySize: false }).map((f) => f.format_id)).toEqual(["1080", "960", "720", "720w", "480", "360", "240", "144"])
  })

  it("sorting by size reorders those same rows instead of swapping in the smallest formats", () => {
    const sorted = videoRows(video, { bySize: true }).map((f) => f.format_id)
    expect(sorted).toEqual(["144", "240", "360", "480", "720w", "720", "960", "1080"])
    expect(new Set(sorted)).toEqual(new Set(videoRows(video, { bySize: false }).map((f) => f.format_id)))
  })

  it("keeps the true best quality for the best-only row, whatever the sort", () => {
    expect(videoRows(video, { bySize: true, bestOnly: true }).map((f) => f.format_id)).toEqual(["1080"])
  })
})

describe("audioRows", () => {
  const audio = [
    fmt("opus160", null, 1, "webm", 160),
    fmt("m4a128", null, 1, "m4a", 128),
    fmt("opus70", null, 1, "webm", 70),
    fmt("m4a48", null, 1, "m4a", 48),
    fmt("opus50", null, 1, "webm", 50),
    fmt("mp3", null, 1, "mp3", 32),
  ]

  it("reorders the five listed tracks by compatibility, without swapping in the sixth", () => {
    expect(audioRows(audio, { byCompatibility: false }).map((f) => f.format_id)).toEqual(["opus160", "m4a128", "opus70", "m4a48", "opus50"])
    expect(audioRows(audio, { byCompatibility: true }).map((f) => f.format_id)).toEqual(["opus160", "opus70", "opus50", "m4a128", "m4a48"])
  })
})

describe("bestAudioFormat", () => {
  it("matches the server: AAC over a WebM track of about the same bitrate, the top bitrate otherwise", () => {
    expect(bestAudioFormat([fmt("251", null, 1, "webm", 135), fmt("140", null, 1, "m4a", 129)])?.format_id).toBe("140")
    expect(bestAudioFormat([fmt("opus", null, 1, "webm", 160), fmt("aac", null, 1, "m4a", 48)])?.format_id).toBe("opus")
  })
})

describe("videoRows by size when the source lists no sizes", () => {
  it("sorts by the estimated sizes, then puts a heightless row last among the sized ones (before pinning)", () => {
    // "noheight" has no resolution at all, which the row displays as "Original" and videoRows pins to the
    // front (see below) — so it is deliberately not a plain height=null row here to isolate the size sort itself.
    const rows = [fmt("1080", 1080, null), fmt("720", 720, null), fmt("noheight", null, null), fmt("est", 480, 9_000_000)]
    rows[3].filesizeApprox = true
    expect(videoRows(rows, { bySize: true }).map((f) => f.format_id)).toEqual(["noheight", "est", "720", "1080"])
  })
})

describe("videoRows pins the source's own file ('Original') first", () => {
  it("moves a heightless row to the top regardless of the size sort", () => {
    const rows = [fmt("1080", 1080, 100), fmt("original", null, 40), fmt("720", 720, 60)]
    expect(videoRows(rows, { bySize: false }).map((f) => f.format_id)).toEqual(["original", "1080", "720"])
    expect(videoRows(rows, { bySize: true }).map((f) => f.format_id)).toEqual(["original", "720", "1080"])
  })

  it("does nothing when no row is heightless", () => {
    const rows = [fmt("1080", 1080, 100), fmt("720", 720, 60)]
    expect(videoRows(rows, { bySize: false }).map((f) => f.format_id)).toEqual(["1080", "720"])
  })

  it("still returns only the true best row for bestOnly, even when it is not the heightless one", () => {
    const rows = [fmt("1080", 1080, 100), fmt("original", null, 40)]
    expect(videoRows(rows, { bySize: false, bestOnly: true }).map((f) => f.format_id)).toEqual(["1080"])
  })
})
