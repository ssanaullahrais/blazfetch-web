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

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

/** IS_PHONE_OR_TABLET (pwa.ts) and HIDE_INCOMPATIBLE_VIDEO_ON_PHONE (format-order.ts) are both computed once at
 * module load, from `navigator` and `import.meta.env` respectively — so exercising a specific combination means
 * stubbing both before a fresh import, same idea as the backend's importWithEnv helper. */
async function importWithDevice(userAgent: string, envValue?: string) {
  vi.resetModules()
  vi.stubGlobal("navigator", { userAgent })
  if (envValue === undefined) vi.unstubAllEnvs()
  else vi.stubEnv("VITE_HIDE_INCOMPATIBLE_VIDEO_ON_PHONE", envValue)
  return import("@/lib/format-order")
}

describe("videoRows hides incompatible formats on phones/tablets", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const formats = [fmt("2160-vp9", 2160, false), fmt("1080-h264", 1080, true), fmt("720-h264", 720, true)]

  it("hides incompatible formats on a phone by default", async () => {
    const { videoRows } = await importWithDevice(IPHONE_UA)
    expect(videoRows(formats, { bySize: false }).map((f) => f.format_id)).toEqual(["1080-h264", "720-h264"])
  })

  it("shows every format on desktop, regardless of the setting", async () => {
    const { videoRows } = await importWithDevice(DESKTOP_UA)
    expect(videoRows(formats, { bySize: false }).map((f) => f.format_id)).toEqual(["2160-vp9", "1080-h264", "720-h264"])
  })

  it("shows every format on a phone when explicitly disabled", async () => {
    const { videoRows } = await importWithDevice(IPHONE_UA, "false")
    expect(videoRows(formats, { bySize: false }).map((f) => f.format_id)).toEqual(["2160-vp9", "1080-h264", "720-h264"])
  })

  it("falls back to the full list on a phone when nothing compatible is left, instead of showing nothing", async () => {
    const { videoRows } = await importWithDevice(IPHONE_UA)
    const allIncompatible = [fmt("2160-vp9", 2160, false), fmt("1440-vp9", 1440, false)]
    expect(videoRows(allIncompatible, { bySize: false }).map((f) => f.format_id)).toEqual(["2160-vp9", "1440-vp9"])
  })
})
