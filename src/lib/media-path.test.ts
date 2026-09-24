import { describe, expect, it } from "vitest"
import { PLATFORM_SLUGS, shareUrlForPath, storedPathFromLocation } from "@/lib/media-path"

describe("storedPathFromLocation", () => {
  it("recognises item and playlist page paths", () => {
    expect(storedPathFromLocation("/youtube/dQw4w9WgXcQ")).toBe("/youtube/dQw4w9WgXcQ")
    expect(storedPathFromLocation("/youtube/Cwkej79U3ek/playlist/RDCwkej79U3ek")).toBe("/youtube/Cwkej79U3ek/playlist/RDCwkej79U3ek")
    expect(storedPathFromLocation("/youtube/playlist/PL1")).toBe("/youtube/playlist/PL1")
    expect(storedPathFromLocation("/tiktok/6718335390845095173/")).toBe("/tiktok/6718335390845095173")
  })

  it("keeps percent-encoding so it can go straight into an API URL", () => {
    expect(storedPathFromLocation("/soundcloud/a%2Fb")).toBe("/soundcloud/a%2Fb")
  })

  it("is null for the home page and other routes", () => {
    expect(storedPathFromLocation("/")).toBeNull()
    expect(storedPathFromLocation("/about")).toBeNull()
    expect(storedPathFromLocation("/nowhere/abc")).toBeNull()
    expect(storedPathFromLocation("/youtube")).toBeNull()
  })

  it("rejects paths that are not a valid item or playlist shape", () => {
    expect(storedPathFromLocation("/youtube/playlist")).toBeNull()
    expect(storedPathFromLocation("/youtube/a/b/c")).toBeNull()
    expect(storedPathFromLocation("/youtube/a/b/c/d")).toBeNull()
    expect(storedPathFromLocation("/%E0%A4%A/x")).toBeNull()
  })

  it("covers every platform the backend supports", () => {
    expect(PLATFORM_SLUGS).toHaveLength(18)
    for (const slug of PLATFORM_SLUGS) expect(storedPathFromLocation(`/${slug}/id1`)).toBe(`/${slug}/id1`)
  })
})

describe("shareUrlForPath", () => {
  it("shares the stable page path when there is one", () => {
    expect(shareUrlForPath("https://blaz.example", "/youtube/abc", "https://youtu.be/abc")).toBe("https://blaz.example/youtube/abc")
  })

  it("falls back to a ?url= link", () => {
    expect(shareUrlForPath("https://blaz.example", null, "https://a.com/x?y=1")).toBe("https://blaz.example/?url=https%3A%2F%2Fa.com%2Fx%3Fy%3D1")
  })
})
