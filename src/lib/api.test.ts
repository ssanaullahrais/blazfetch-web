import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchInfo, getStoredMedia, toMediaInfo } from "@/lib/api"
import { ApiError, getTombstone } from "@/lib/errors"
import youtube from "@/lib/__fixtures__/youtube.json"
import youtubePlaylist from "@/lib/__fixtures__/youtube-playlist.json"
import youtubeFallback from "@/lib/__fixtures__/youtube-blocked-fallback.json"
import tiktok from "@/lib/__fixtures__/tiktok.json"
import soundcloud from "@/lib/__fixtures__/soundcloud.json"
import pinterestBoard from "@/lib/__fixtures__/pinterest-board.json"

// These fixtures are real responses captured from the backend (its docs/examples/), trimmed for size.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asApi = (fixture: unknown) => fixture as any

describe("toMediaInfo (real backend responses)", () => {
  it("maps a YouTube video: formats highest first, audio rows, stable path and stats", () => {
    const info = toMediaInfo(asApi(youtube))
    expect(info).toMatchObject({ type: "video", extractor: "youtube", id: "dQw4w9WgXcQ", uploader: "Rick Astley" })
    expect(info.videoFormats.length).toBeGreaterThan(0)
    const heights = info.videoFormats.map((f) => f.height ?? 0)
    expect(heights).toEqual([...heights].sort((a, b) => b - a))
    expect(info.stored).toMatchObject({ path: "/youtube/dQw4w9WgXcQ", playlistPath: null })
    expect(info.stored?.downloads).toBeGreaterThanOrEqual(0)
    expect(info.fallbackUsed).toBeNull()
  })

  it("flags video-only formats as needing no client work (the server merges) and marks non-H.264 ones", () => {
    const info = toMediaInfo(asApi(youtube))
    const modern = info.videoFormats.find((f) => f.vcodec?.startsWith("av01") || f.vcodec?.startsWith("vp09"))
    expect(modern?.note).toBe("may not play everywhere")
  })

  it("maps a playlist to entries with their own links", () => {
    const info = toMediaInfo(asApi(youtubePlaylist))
    expect(info.type).toBe("playlist")
    expect(info.entries?.length).toBeGreaterThan(0)
    expect(info.entries?.[0]).toMatchObject({ url: expect.stringContaining("youtube.com/watch?v="), title: expect.any(String) })
    expect(info.stored?.path).toBe("/youtube/playlist/PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI")
    expect(info.videoFormats).toEqual([])
  })

  it("reports the fallback provider and its single MP4 / M4A option", () => {
    const info = toMediaInfo(asApi(youtubeFallback))
    expect(info.fallbackUsed).toBe("btch-downloader")
    expect(info.videoFormats.map((f) => f.format_id)).toEqual(["btch-mp4"])
    expect(info.audioFormats.map((f) => f.format_id)).toEqual(["btch-m4a"])
  })

  it("marks an audio-only source (SoundCloud) as audio only", () => {
    const info = toMediaInfo(asApi(soundcloud))
    expect(info.audioOnly).toBe(true)
    expect(info.videoFormats).toEqual([])
    expect(info.audioFormats.length).toBeGreaterThan(0)
  })

  it("keeps a normal video from being audio only", () => {
    expect(toMediaInfo(asApi(tiktok)).audioOnly).toBe(false)
  })

  it("maps an image-only Pinterest board to a gallery with a paging range", () => {
    const info = toMediaInfo(asApi(pinterestBoard))
    expect(info.type).toBe("images")
    expect(info.images?.length).toBeGreaterThan(0)
    expect(info.range).toMatchObject({ total: expect.any(Number), start: expect.any(Number), end: expect.any(Number) })
  })

  it("maps a board with a video pin to a carousel: videos download by their own format id, images save directly", () => {
    // A real video pin from the same board (see the backend's docs/examples/pinterest-board.json).
    const videoPin = {
      id: "424605071136961057",
      type: "video",
      thumbnail: "https://i.pinimg.com/originals/dc/59/c7/dc59c78056607f0250deb7611d3877.jpg",
      durationSeconds: 43.333,
      formats: [
        { formatId: "board-424605071136961057-hls", ext: "m3u8", kind: "video", url: "https://v1.pinimg.com/videos/mc/hls/91/ee/22/91ee22f657.m3u8", compatible: true },
        { formatId: "board-424605071136961057-mp4", ext: "mp4", kind: "video", url: "https://v1.pinimg.com/videos/mc/expMp4/91/ee/22/91ee22f657.mp4", width: 1080, height: 1920, compatible: true },
      ],
    }
    const info = toMediaInfo(asApi({ ...pinterestBoard, items: [...pinterestBoard.items, videoPin] }))
    expect(info.type).toBe("carousel")
    expect(info.carouselVideos).toHaveLength(1)
    expect(info.carouselVideos?.[0]).toMatchObject({ id: "424605071136961057", formatId: "board-424605071136961057-mp4", ext: "mp4" })
    expect(info.images?.length).toBe(pinterestBoard.items.length)
  })
})

/** Records the calls a client makes and answers each with a canned backend response. */
function stubBackend(routes: Record<string, { status?: number; body: unknown }>) {
  const calls: { path: string; method: string; body?: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).replace(/^.*\/api\/v1/, "")
      calls.push({ path, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined })
      const route = routes[`${init.method ?? "GET"} ${path}`]
      if (!route) throw new Error(`unexpected call ${init.method ?? "GET"} ${path}`)
      const status = route.status ?? 200
      return { ok: status < 400, status, json: async () => route.body } as Response
    })
  )
  return calls
}

describe("fetchInfo / getStoredMedia", () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => vi.unstubAllGlobals())

  it("makes one POST /fetch for a video that has audio, with the guest cookie", async () => {
    const calls = stubBackend({ "POST /fetch": { body: youtube } })
    const info = await fetchInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ path: "/fetch", method: "POST", body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } })
    expect(info.audioFormats.length).toBeGreaterThan(0)
    expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).credentials).toBe("include")
  })

  it("asks POST /fetch/audio for the converted-MP3 option only when the source has no audio track", async () => {
    const noAudio = { ...youtube, audioFormats: [] }
    const calls = stubBackend({
      "POST /fetch": { body: noAudio },
      "POST /fetch/audio": { body: { success: true, audioFormats: [{ formatId: "mp3-from-18", ext: "mp3", bitrate: 192, isConverted: true }] } },
    })
    const info = await fetchInfo("https://example.com/v")
    expect(calls.map((c) => c.path)).toEqual(["/fetch", "/fetch/audio"])
    expect(info.audioFormats).toHaveLength(1)
    expect(info.audioFormats[0]).toMatchObject({ format_id: "mp3-from-18", note: "converted to MP3" })
  })

  it("does not call /fetch/audio for audio-only sources or playlists", async () => {
    let calls = stubBackend({ "POST /fetch": { body: soundcloud } })
    await fetchInfo("https://soundcloud.com/a/b")
    expect(calls).toHaveLength(1)
    calls = stubBackend({ "POST /fetch": { body: youtubePlaylist } })
    await fetchInfo("https://www.youtube.com/playlist?list=PL1")
    expect(calls).toHaveLength(1)
  })

  it("survives /fetch/audio failing", async () => {
    stubBackend({ "POST /fetch": { body: { ...youtube, audioFormats: [] } }, "POST /fetch/audio": { status: 502, body: { success: false, error: { code: "EXTRACTOR_FAILED", message: "x" } } } })
    const info = await fetchInfo("https://example.com/v")
    expect(info.audioFormats).toEqual([])
  })

  it("forwards forceRefresh and the board range to the backend", async () => {
    const calls = stubBackend({ "POST /fetch": { body: pinterestBoard } })
    await fetchInfo("https://www.pinterest.com/pinterest/official-news/", { forceRefresh: true, rangeStart: 1, rangeEnd: 20 })
    expect(calls[0].body).toMatchObject({ forceRefresh: true, rangeStart: 1, rangeEnd: 20 })
  })

  it("opens a stored page by path with GET /media/...", async () => {
    const calls = stubBackend({ "GET /media/youtube/dQw4w9WgXcQ": { body: youtube } })
    const info = await getStoredMedia("/youtube/dQw4w9WgXcQ")
    expect(calls).toEqual([{ path: "/media/youtube/dQw4w9WgXcQ", method: "GET", body: undefined }])
    expect(info.stored?.path).toBe("/youtube/dQw4w9WgXcQ")
  })

  it("turns a 410 into an ApiError carrying the tombstone", async () => {
    stubBackend({
      "GET /media/youtube/gone1": {
        status: 410,
        body: { success: false, error: { code: "MEDIA_UNAVAILABLE", message: "gone", details: { tombstone: { title: "Old video", reason: "MEDIA_NOT_FOUND" } } } },
      },
    })
    const err = await getStoredMedia("/youtube/gone1").catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: "MEDIA_UNAVAILABLE", status: 410 })
    expect(getTombstone(err)).toMatchObject({ title: "Old video" })
  })

  it("reports a network failure as NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    await expect(fetchInfo("https://example.com/v")).rejects.toMatchObject({ code: "NETWORK_ERROR" })
  })
})
