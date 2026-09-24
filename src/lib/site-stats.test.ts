import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCount, getSiteStats } from "@/lib/site-stats";

describe("formatCount", () => {
  it("keeps the footer short", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1234)).toBe("1.2K");
    expect(formatCount(34000)).toBe("34K");
    expect(formatCount(2_100_000)).toBe("2.1M");
  });
});

describe("getSiteStats", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the totals", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, fetches: 12, downloads: 5 }) })));
    await expect(getSiteStats()).resolves.toEqual({ fetches: 12, downloads: 5 });
  });

  it("gives null when the backend has no stats or is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ success: false }) })));
    await expect(getSiteStats()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    await expect(getSiteStats()).resolves.toBeNull();
  });
});
