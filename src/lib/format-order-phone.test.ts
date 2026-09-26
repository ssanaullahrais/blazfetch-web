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

/** DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE (format-order.ts) is computed once from import.meta.env at module load, so
 * testing it disabled means stubbing the env var before a fresh import — same idea as the backend's
 * importWithEnv helper. `isPhone` itself is a plain parameter (from useIsMobile, a real width check). */
async function importWithEnv(envValue?: string) {
  vi.resetModules()
  if (envValue === undefined) vi.unstubAllEnvs()
  else vi.stubEnv("VITE_DISABLE_INCOMPATIBLE_VIDEO_ON_PHONE", envValue)
  return import("@/lib/format-order")
}

describe("phoneIncompatibleFormatIds", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("flags an incompatible format on a phone-width screen, by default", async () => {
    const { phoneIncompatibleFormatIds } = await importWithEnv()
    const formats = [fmt("2160-vp9", 2160, false), fmt("1080-h264", 1080, true)]
    expect(phoneIncompatibleFormatIds(formats, true)).toEqual(new Set(["2160-vp9"]))
  })

  it("flags nothing on a wide (desktop) screen, regardless of compatibility", async () => {
    const { phoneIncompatibleFormatIds } = await importWithEnv()
    const formats = [fmt("2160-vp9", 2160, false), fmt("1080-h264", 1080, true)]
    expect(phoneIncompatibleFormatIds(formats, false)).toEqual(new Set())
  })

  it("flags nothing when explicitly disabled", async () => {
    const { phoneIncompatibleFormatIds } = await importWithEnv("false")
    const formats = [fmt("2160-vp9", 2160, false), fmt("1080-h264", 1080, true)]
    expect(phoneIncompatibleFormatIds(formats, true)).toEqual(new Set())
  })

  it("flags nothing when every listed format is incompatible, so the visitor isn't left with nothing at all", async () => {
    const { phoneIncompatibleFormatIds } = await importWithEnv()
    const formats = [fmt("2160-vp9", 2160, false), fmt("1440-vp9", 1440, false)]
    expect(phoneIncompatibleFormatIds(formats, true)).toEqual(new Set())
  })

  it("flags nothing for an empty list", async () => {
    const { phoneIncompatibleFormatIds } = await importWithEnv()
    expect(phoneIncompatibleFormatIds([], true)).toEqual(new Set())
  })
})
