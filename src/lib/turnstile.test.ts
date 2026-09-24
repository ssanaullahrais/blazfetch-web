import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/turnstile");
}

describe("turnstile", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing when the backend has Turnstile off", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: false } }));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    await expect(t.waitForPass()).resolves.toBeUndefined();
  });

  it("treats a backend without /config as having no check", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    await expect(t.waitForPass()).resolves.toBeUndefined();
  });

  it("holds requests until the token is accepted, then lets them through", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: true, siteKey: "1x00000000000000000000AA", sessionSeconds: 1800 } }))
      .mockResolvedValueOnce(reply({ success: true, enabled: true }));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    let seen = "";
    const unsubscribe = (() => {
      const stop = setInterval(() => undefined, 1000);
      return () => clearInterval(stop);
    })();
    let released = false;
    const waiting = t.waitForPass().then(() => (released = true));
    await Promise.resolve();
    expect(released).toBe(false);
    unsubscribe();
    expect(seen).toBe("");
    await t.submitToken("XXXX.DUMMY.TOKEN.XXXX");
    await waiting;
    expect(released).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("/api/v1/turnstile/verify");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ token: "XXXX.DUMMY.TOKEN.XXXX" });
  });

  it("asks again after the pass is lost, and reports a refused token as an error", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: true, siteKey: "k" } }))
      .mockResolvedValueOnce(reply({ success: false, error: { code: "TURNSTILE_FAILED", message: "no" } }, 403));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    await t.submitToken("bad");
    const { useTurnstile } = t;
    expect(typeof useTurnstile).toBe("function");
    t.markPassLost();
    let released = false;
    void t.waitForPass().then(() => (released = true));
    await Promise.resolve();
    expect(released).toBe(false);
  });
});
