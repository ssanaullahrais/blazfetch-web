import { describe, expect, it } from "vitest"
import type { MediaFormat } from "@/lib/api"
import { audioRows, videoRows } from "@/lib/format-order"

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
