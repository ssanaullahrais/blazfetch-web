import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCount, getSiteStats, watchSiteStats } from "@/lib/site-stats";

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
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/stats'), expect.objectContaining({ cache: 'no-store' }));
  });

  it("gives null when the backend has no stats or is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ success: false }) })));
    await expect(getSiteStats()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    await expect(getSiteStats()).resolves.toBeNull();
  });

  it.each([{ fetches: null, downloads: 1 }, { fetches: -1, downloads: 1 }, { fetches: 1.5, downloads: 0 }, { fetches: 1 }])('rejects invalid totals %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
    await expect(getSiteStats()).resolves.toBeNull();
  });
});

describe('live site stats', () => {
  class Source {
    static instances: Source[] = [];
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    close = vi.fn();
    constructor() { Source.instances.push(this); }
    send(fetches: number, downloads: number) { this.onmessage?.({ data: JSON.stringify({ success: true, fetches, downloads }) }); }
  }
  let doc: EventTarget & { visibilityState: string };
  let stop: (() => void) | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    Source.instances = [];
    doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('EventSource', Source);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ fetches: 10, downloads: 2 }) })));
  });
  afterEach(() => { stop?.(); stop = undefined; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('applies pushed totals immediately and prevents an older HTTP response overwriting them', async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
    const changed = vi.fn();
    stop = watchSiteStats(changed);
    Source.instances[0].send(11, 3);
    expect(changed).toHaveBeenLastCalledWith({ fetches: 11, downloads: 3 });
    resolve({ ok: true, json: async () => ({ fetches: 10, downloads: 2 }) } as Response);
    await vi.advanceTimersByTimeAsync(0);
    expect(changed).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('polls during a connection failure, stops while hidden and reconnects when visible', async () => {
    stop = watchSiteStats(vi.fn());
    Source.instances[0].send(10, 2);
    Source.instances[0].onerror?.();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(Source.instances[0].close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetch).toHaveBeenCalledTimes(2);
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'));
    expect(Source.instances).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('keeps working when EventSource is unavailable and cleans up polling', async () => {
    vi.stubGlobal('EventSource', undefined);
    stop = watchSiteStats(vi.fn());
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
    stop(); stop = undefined;
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
