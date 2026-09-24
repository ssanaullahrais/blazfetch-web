import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/errors"
import {
  buildStreamUrl,
  newDownloadToken,
  START_COOKIE_PREFIX,
  startBrowserDownload,
  type DownloadEnv,
  type FrameHandle,
} from "@/lib/stream-download"

describe("buildStreamUrl", () => {
  it("builds the one-request download URL", () => {
    const url = new URL(
      buildStreamUrl({ url: "https://youtu.be/abc?t=1", kind: "video", formatId: "137", filename: "My clip", mode: "prepare" }, "tok12345"),
      "http://localhost"
    )
    expect(url.pathname).toBe("/api/v1/stream")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      url: "https://youtu.be/abc?t=1",
      kind: "video",
      formatId: "137",
      filename: "My clip",
      mode: "prepare",
      token: "tok12345",
    })
  })

  it("defaults to auto mode, omits a missing format (best) and a missing token", () => {
    const url = new URL(buildStreamUrl({ url: "example.com/v", kind: "audio" }), "http://localhost")
    expect(url.searchParams.get("mode")).toBe("auto")
    expect(url.searchParams.has("formatId")).toBe(false)
    expect(url.searchParams.has("token")).toBe(false)
    expect(url.searchParams.get("url")).toBe("https://example.com/v") // scheme added like everywhere else
  })

  it("keeps the file name within the backend's limit", () => {
    const url = new URL(buildStreamUrl({ url: "https://a.com/v", kind: "video", filename: "x".repeat(500) }), "http://localhost")
    expect(url.searchParams.get("filename")).toHaveLength(200)
  })
})

describe("newDownloadToken", () => {
  it("is unique and accepted by the backend's token pattern", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newDownloadToken()))
    expect(tokens.size).toBe(50)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })
})

/** A browser stand-in: cookies, a frame whose page content the test controls, and a record of what happened. */
function fakeEnv(overrides: Partial<DownloadEnv> = {}) {
  const cookies = new Set<string>()
  const log = { frameUrls: [] as string[], removed: 0, navigated: [] as string[], cleared: [] as string[] }
  let loadCallback: (() => void) | undefined
  let pageText: string | null = ""

  const frame: FrameHandle = {
    onLoad: (cb) => {
      loadCallback = cb
    },
    bodyText: () => pageText,
    remove: () => {
      log.removed += 1
    },
  }
  const env: DownloadEnv = {
    observable: true,
    hasCookie: (name) => cookies.has(name),
    clearCookie: (name) => {
      cookies.delete(name)
      log.cleared.push(name)
    },
    createFrame: (url) => {
      log.frameUrls.push(url)
      return frame
    },
    navigate: (url) => {
      log.navigated.push(url)
    },
    ...overrides,
  }
  return {
    env,
    log,
    tokenFromFrame: () => new URL(log.frameUrls[0], "http://localhost").searchParams.get("token") as string,
    setCookie: (name: string) => cookies.add(name),
    showPage: (text: string) => {
      pageText = text
      loadCallback?.()
    },
  }
}

describe("startBrowserDownload", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const params = { url: "https://www.tiktok.com/@a/video/1", kind: "video" as const }

  it("starts the download in a hidden frame and resolves when the backend's start cookie appears", async () => {
    const t = fakeEnv()
    let resolved = false
    const promise = startBrowserDownload(params, { env: t.env }).then(() => (resolved = true))

    await vi.advanceTimersByTimeAsync(1000)
    expect(t.log.frameUrls).toHaveLength(1)
    expect(resolved).toBe(false) // still preparing: no bytes yet

    t.setCookie(`${START_COOKIE_PREFIX}${t.tokenFromFrame()}`)
    await vi.advanceTimersByTimeAsync(300)
    await promise
    expect(resolved).toBe(true)
    expect(t.log.cleared).toEqual([`${START_COOKIE_PREFIX}${t.tokenFromFrame()}`])
  })

  it("keeps the frame alive briefly after the start (so the browser finishes taking over), then removes it", async () => {
    const t = fakeEnv()
    const promise = startBrowserDownload(params, { env: t.env })
    t.setCookie(`${START_COOKIE_PREFIX}${t.tokenFromFrame()}`)
    await vi.advanceTimersByTimeAsync(300)
    await promise
    expect(t.log.removed).toBe(0)
    await vi.advanceTimersByTimeAsync(61_000)
    expect(t.log.removed).toBe(1)
  })

  it("rejects with the server's own error when a JSON error lands in the frame", async () => {
    const t = fakeEnv()
    const promise = startBrowserDownload(params, { env: t.env })
    const assertion = expect(promise).rejects.toMatchObject({ code: "PRIVATE_MEDIA", message: "This media is private." })
    t.showPage('{"success":false,"error":{"code":"PRIVATE_MEDIA","message":"This media is private."}}')
    await assertion
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    expect(t.log.removed).toBe(1)
  })

  it("ignores a frame load that is not an error (an attachment leaves the frame blank)", async () => {
    const t = fakeEnv()
    let settled = false
    const promise = startBrowserDownload(params, { env: t.env }).then(
      () => (settled = true),
      () => (settled = true)
    )
    t.showPage("")
    await vi.advanceTimersByTimeAsync(1000)
    expect(settled).toBe(false)
    t.setCookie(`${START_COOKIE_PREFIX}${t.tokenFromFrame()}`)
    await vi.advanceTimersByTimeAsync(300)
    await promise
    expect(settled).toBe(true)
  })

  it("cancels: aborting removes the frame (which stops the request) and rejects with AbortError", async () => {
    const t = fakeEnv()
    const abort = new AbortController()
    const promise = startBrowserDownload(params, { env: t.env, signal: abort.signal })
    const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" })
    await vi.advanceTimersByTimeAsync(500)
    abort.abort()
    await assertion
    expect(t.log.removed).toBe(1)
    // nothing keeps polling afterwards
    t.setCookie(`${START_COOKIE_PREFIX}${t.tokenFromFrame()}`)
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.log.cleared).toEqual([])
  })

  it("does not start at all when already aborted", async () => {
    const t = fakeEnv()
    const abort = new AbortController()
    abort.abort()
    await expect(startBrowserDownload(params, { env: t.env, signal: abort.signal })).rejects.toMatchObject({ name: "AbortError" })
    expect(t.log.frameUrls).toHaveLength(0)
  })

  it("gives up with PROCESS_TIMEOUT when it never starts", async () => {
    const t = fakeEnv()
    const promise = startBrowserDownload(params, { env: t.env, maxWaitMs: 5000 })
    const assertion = expect(promise).rejects.toMatchObject({ code: "PROCESS_TIMEOUT" })
    await vi.advanceTimersByTimeAsync(5100)
    await assertion
    expect(t.log.removed).toBe(1)
  })

  it("hands the download over by plain navigation when the API is on another origin (cannot be observed)", async () => {
    const t = fakeEnv({ observable: false })
    await startBrowserDownload(params, { env: t.env })
    expect(t.log.navigated).toHaveLength(1)
    expect(t.log.frameUrls).toHaveLength(0)
  })

  it("puts the token and settings in the URL it navigates to", async () => {
    const t = fakeEnv()
    void startBrowserDownload({ ...params, formatId: "18", filename: "clip", mode: "stream" }, { env: t.env }).catch(() => undefined)
    const url = new URL(t.log.frameUrls[0], "http://localhost")
    expect(url.pathname).toBe("/api/v1/stream")
    expect(url.searchParams.get("formatId")).toBe("18")
    expect(url.searchParams.get("mode")).toBe("stream")
    expect(t.tokenFromFrame()).toMatch(/^[0-9a-f]{16}$/)
  })
})
