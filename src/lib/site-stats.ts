import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { onStatsChanged } from "@/lib/stats-events";

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

const POLL_MS = 2_000;

/**
 * Listen for committed totals. Poll only when the live connection is unavailable, and reconnect after hiding the tab.
 */
export function watchSiteStats(onStats: (value: SiteStats) => void): () => void {
    let cancelled = false;
    let revision = 0;
    let live = false;
    let source: EventSource | null = null;
    const load = () => {
      const requestRevision = ++revision;
      void getSiteStats().then((value) => {
        if (!cancelled && requestRevision === revision && value) onStats(value);
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
              onStats(value);
            }
          } catch { /* Keep the last valid totals. */ }
        };
        source.onerror = () => { live = false; }; // EventSource retries; polling covers the gap.
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
