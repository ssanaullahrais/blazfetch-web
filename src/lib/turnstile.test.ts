import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/turnstile");
}

describe("turnstile", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("does nothing when the backend has Turnstile off", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: false } }));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    await expect(t.waitForPass()).resolves.toBeUndefined();
  });

  it("fails closed on a config outage and retries the configuration on the next action", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const t = await freshModule();
    await expect(t.initTurnstile("/api/v1")).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    vi.mocked(fetch).mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: false } }));
    await expect(t.waitForPass()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("holds requests until the token is accepted, then lets them through", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: true, siteKey: "1x00000000000000000000AA", sessionSeconds: 1800 } }))
      .mockResolvedValueOnce(reply({ success: true, enabled: true }));
    const t = await freshModule();
    await t.initTurnstile("/api/v1");
    let released = false;
    const waiting = t.waitForPass().then(() => (released = true));
    await Promise.resolve();
    expect(released).toBe(false);
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
    const waiting = t.waitForPass().then(() => (released = true));
    await Promise.resolve();
    expect(released).toBe(false);
    const rejected = expect(waiting).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
    t.markCheckFailed();
    await rejected;
  });

  it('shares configuration loading between concurrent callers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: false } }));
    const t = await freshModule();
    await Promise.all([t.initTurnstile('/api/v1'), t.waitForPass(), t.waitForPass()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the server pass expiry and does not reuse a submitted token', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply({ success: true, turnstile: { enabled: true, siteKey: 'key', sessionSeconds: 1800 } }))
      .mockResolvedValueOnce(reply({ success: true, enabled: true, expiresIn: 60 }));
    const t = await freshModule();
    await t.initTurnstile('/api/v1');
    await Promise.all([t.submitToken('token'), t.submitToken('token')]);
    expect(fetch).toHaveBeenCalledTimes(2);
    await expect(t.waitForPass()).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(31000);
    const waiting = t.waitForPass();
    const rejected = expect(waiting).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
    t.markCheckFailed();
    await rejected;
  });
});
