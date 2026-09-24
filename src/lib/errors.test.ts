import { describe, expect, it } from "vitest"
import {
  ApiError,
  apiErrorFromBody,
  errorTitleFor,
  friendlyError,
  friendlyErrorFor,
  getTombstone,
  parseErrorFromText,
} from "@/lib/errors"

describe("parseErrorFromText", () => {
  it("reads the backend's JSON envelope as a browser renders it", () => {
    const text = '{"success":false,"error":{"code":"PRIVATE_MEDIA","message":"This media is private."},"requestId":"abc"}'
    expect(parseErrorFromText(text)).toEqual({ code: "PRIVATE_MEDIA", message: "This media is private." })
  })

  it("tolerates the pretty printing and viewer text some browsers add", () => {
    const text = `JSON Raw Data Headers Save Copy
      success: false
      "success": false,
      "error": {
        "code": "MEDIA_NOT_FOUND",
        "message": "Media could not be found at the given URL."
      }`
    expect(parseErrorFromText(text)).toEqual({ code: "MEDIA_NOT_FOUND", message: "Media could not be found at the given URL." })
  })

  it("decodes escaped characters in the message", () => {
    const text = '{"success":false,"error":{"code":"DOWNLOAD_FAILED","message":"It said \\"no\\" \\u00e9"}}'
    expect(parseErrorFromText(text)?.message).toBe('It said "no" é')
  })

  it("ignores anything that is not a failure envelope", () => {
    expect(parseErrorFromText("")).toBeNull()
    expect(parseErrorFromText('{"success":true,"title":"x"}')).toBeNull()
    expect(parseErrorFromText("<html>Not found</html>")).toBeNull()
    expect(parseErrorFromText('{"success":false}')).toBeNull() // no code to act on
  })
})

describe("ApiError and tombstones", () => {
  it("builds an ApiError from a backend error body", () => {
    const err = apiErrorFromBody({ success: false, error: { code: "SERVER_BUSY", message: "busy" } }, 503)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: "SERVER_BUSY", message: "busy", status: 503 })
  })

  it("falls back to a generic error when the body is not ours", () => {
    expect(apiErrorFromBody(null, 502)).toMatchObject({ code: "UNKNOWN", status: 502 })
  })

  it("returns the tombstone of a MEDIA_UNAVAILABLE error, and null for anything else", () => {
    const tombstone = { title: "Gone video", reason: "MEDIA_NOT_FOUND", path: "/youtube/abc" }
    const err = apiErrorFromBody({ error: { code: "MEDIA_UNAVAILABLE", message: "gone", details: { tombstone } } }, 410)
    expect(getTombstone(err)).toEqual(tombstone)
    expect(getTombstone(new ApiError("MEDIA_NOT_FOUND", "x", 404))).toBeNull()
    expect(getTombstone(new Error("x"))).toBeNull()
  })
})

describe("friendly messages", () => {
  it.each([
    ["UNSUPPORTED_PLATFORM", /supported site/i],
    ["MEDIA_NOT_FOUND", /couldn't be found/i],
    ["MEDIA_UNAVAILABLE", /no longer available/i],
    ["PRIVATE_MEDIA", /private/i],
    ["LOGIN_REQUIRED", /login/i],
    ["AGE_RESTRICTED", /age-restricted/i],
    ["GEO_RESTRICTED", /region/i],
    ["FORMAT_UNAVAILABLE", /copy-protected/i],
    ["PLATFORM_RATE_LIMITED", /limiting requests/i],
    ["SERVER_BUSY", /busy/i],
    ["PROCESS_TIMEOUT", /too long/i],
    ["FILE_TOO_LARGE", /too large/i],
  ])("maps %s to plain wording", (code, pattern) => {
    expect(friendlyErrorFor(new ApiError(code, "raw backend message"))).toMatch(pattern)
  })

  it("never shows raw extractor text for a known code", () => {
    const err = new ApiError("EXTRACTOR_FAILED", "ERROR: [youtube] abc: Sign in to confirm you're not a bot")
    expect(friendlyErrorFor(err)).not.toMatch(/youtube|ERROR/)
  })

  it("falls back to the message wording for errors without a backend code", () => {
    expect(friendlyErrorFor(new Error("Failed to fetch"))).toMatch(/could not be reached/i)
    expect(friendlyError("ERROR: [Instagram] X: Some odd reason. More detail here")).toBe("Some odd reason.")
    expect(friendlyErrorFor("weird")).toMatch(/something went wrong/i)
  })

  it("chooses a short toast title", () => {
    expect(errorTitleFor(new ApiError("UNSUPPORTED_PLATFORM", ""))).toBe("Not supported")
    expect(errorTitleFor(new ApiError("MEDIA_UNAVAILABLE", ""))).toBe("Video not found")
    expect(errorTitleFor(new ApiError("PRIVATE_MEDIA", ""))).toBe("Can't download this")
    expect(errorTitleFor(new ApiError("SERVER_BUSY", ""))).toBe("Try again later")
  })
})
