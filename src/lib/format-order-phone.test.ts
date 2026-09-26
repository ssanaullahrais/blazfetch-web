import { afterEach, describe, expect, it, vi } from "vitest"
import type { MediaFormat } from "@/lib/api"

const fmt = (id: string, height: number | null, compatible = true): MediaFormat => ({
  format_id: id,
  ext: "mp4",
  resolution: height ? `${height}p` : null,
  height,
  fps: null,
  hasVideo: true,
  hasAudio: true,
  note: null,
  filesize: null,
  filesizeApprox: false,
  abr: null,
  tbr: null,
  vcodec: null,
  acodec: null,
  compatible,
})

/** HIDE_INCOMPATIBLE_VIDEO_ON_PHONE (format-order.ts) is computed once from import.meta.env at module load, so
 * testing it disabled means stubbing the env var before a fresh import — same idea as the backend's
 * importWithEnv helper. `isPhone` itself is now a plain parameter (from useIsMobile, a real width check), so it
 * needs no such gymnastics. */
async function importWithEnv(envValue?: string) {
  vi.resetModules()
  if (envValue === undefined) vi.unstubAllEnvs()
  else vi.stubEnv("VITE_HIDE_INCOMPATIBLE_VIDEO_ON_PHONE", envValue)
  return import("@/lib/format-order")
}

describe("videoRows hides incompatible formats on a phone-width screen", () => {
  afterEach(() => vi.unstubAllEnvs())

  const formats = [fmt("2160-vp9", 2160, false), fmt("1080-h264", 1080, true), fmt("720-h264", 720, true)]

  it("hides incompatible formats when isPhone is true, by default", async () => {
    const { videoRows } = await importWithEnv()
    expect(videoRows(formats, { bySize: false, isPhone: true }).map((f) => f.format_id)).toEqual(["1080-h264", "720-h264"])
  })

  it("shows every format when isPhone is false, regardless of the setting", async () => {
    const { videoRows } = await importWithEnv()
    expect(videoRows(formats, { bySize: false, isPhone: false }).map((f) => f.format_id)).toEqual(["2160-vp9", "1080-h264", "720-h264"])
  })

  it("shows every format when isPhone is true but explicitly disabled", async () => {
    const { videoRows } = await importWithEnv("false")
    expect(videoRows(formats, { bySize: false, isPhone: true }).map((f) => f.format_id)).toEqual(["2160-vp9", "1080-h264", "720-h264"])
  })

  it("falls back to the full list when nothing compatible is left, instead of showing nothing", async () => {
    const { videoRows } = await importWithEnv()
    const allIncompatible = [fmt("2160-vp9", 2160, false), fmt("1440-vp9", 1440, false)]
    expect(videoRows(allIncompatible, { bySize: false, isPhone: true }).map((f) => f.format_id)).toEqual(["2160-vp9", "1440-vp9"])
  })
})
