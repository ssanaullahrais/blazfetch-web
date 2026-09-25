import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { notifyStatsChanged, onStatsChanged } from "@/lib/stats-events";

export type SiteStats = { fetches: number; downloads: number };

function parseStats(data: unknown): SiteStats | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.success === false) return null;
  const { fetches, downloads } = value;
  return typeof fetches === "number" && Number.isSafeInteger(fetches) && fetches >= 0 &&
    typeof downloads === "number" && Number.isSafeInteger(downloads) && downloads >= 0
    ? { fetches, downloads } : null;
}

/** All-time totals from the backend (GET /api/v1/stats). Resolves to null when they are not available. */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    const res = await fetch(`${API}/stats`, { credentials: "include", cache: "no-store" });
    const data = await res.json();
    return res.ok ? parseStats(data) : null;
  } catch {
    return null;
  }
}

/** 950, 1.2K, 34K, 2.1M: short enough for a footer. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

// The backend only counts a download once its full transfer is confirmed server-side (see recordDownloadStat
// in the API), which for a large file can lag well behind the click by as long as the transfer itself takes —
// the CTA already shows "Started" the moment the browser accepts the file. Every watcher instead shows the
// server's own total plus however many downloads were started here but not yet confirmed there, so the count
// the visitor just triggered moves immediately; it's worked back down to 0 as the server's own total catches up.
let pendingDownloads = 0;
let lastServerDownloads: number | null = null;

/** Call the moment a download starts (the CTA reaches its done state) — video/audio downloads only, the
 * ones the backend will eventually confirm. Never call this for an image save: nothing on the server ever
 * counts those, so there would be nothing for pendingDownloads to reconcile against and it would drift up
 * forever. */
export function bumpDownloadCount(): void {
  pendingDownloads += 1;
  notifyStatsChanged();
}

/** For tests: this module's pending-download bookkeeping is deliberately shared across every watcher. */
export function resetDownloadCountForTests(): void {
  pendingDownloads = 0;
  lastServerDownloads = null;
}

function reconcileDownloads(value: SiteStats): SiteStats {
  if (lastServerDownloads !== null && value.downloads > lastServerDownloads) {
    pendingDownloads = Math.max(0, pendingDownloads - (value.downloads - lastServerDownloads));
  }
  lastServerDownloads = value.downloads;
  return pendingDownloads > 0 ? { ...value, downloads: value.downloads + pendingDownloads } : value;
}

const POLL_MS = 2_000;
/** After the server refuses or drops the live connection for good, try it again this much later (polling meanwhile). */
const RECONNECT_MS = 30_000;
const EVENT_SOURCE_CLOSED = 2; // EventSource.CLOSED

/**
 * Listen for committed totals. Poll only when the live connection is unavailable, and reconnect after hiding the tab.
 */
export function watchSiteStats(onStats: (value: SiteStats) => void): () => void {
    let cancelled = false;
    let revision = 0;
    let live = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      const requestRevision = ++revision;
      void getSiteStats().then((value) => {
        if (!cancelled && requestRevision === revision && value) onStats(reconcileDownloads(value));
      });
    };
    const connect = () => {
      if (source || document.visibilityState !== "visible" || typeof EventSource === "undefined") return;
      try {
        source = new EventSource(`${API}/stats/events`, { withCredentials: true });
        source.onmessage = (event) => {
          try {
            const value = parseStats(JSON.parse(event.data));
            if (!cancelled && value) {
              live = true;
              revision += 1; // An older HTTP request must not overwrite a pushed snapshot.
              onStats(reconcileDownloads(value));
            }
          } catch { /* Keep the last valid totals. */ }
        };
        source.onerror = () => {
          live = false; // Polling covers the gap.
          // EventSource retries a dropped connection by itself, but not one the server refused (for example 429 when
          // too many tabs are open): that one stays closed, so reconnect later instead of polling forever.
          if (source?.readyState === EVENT_SOURCE_CLOSED) {
            source.close();
            source = null;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => { if (!cancelled) connect(); }, RECONNECT_MS);
          }
        };
      } catch { live = false; }
    };
    const poll = setInterval(() => {
      if (document.visibilityState === "visible" && !live) load();
    }, POLL_MS);
    const stopListening = onStatsChanged(load);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load();
        connect();
      } else {
        clearTimeout(reconnectTimer);
        source?.close();
        source = null;
        live = false;
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    load();
    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      source?.close();
      clearInterval(poll);
      stopListening();
      document.removeEventListener("visibilitychange", onVisible);
    };
}

export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null);
  useEffect(() => watchSiteStats(setStats), []);
  return stats;
}
