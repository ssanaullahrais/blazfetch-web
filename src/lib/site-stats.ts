import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { onStatsChanged } from "@/lib/stats-events";

export type SiteStats = { fetches: number; downloads: number };

/** All-time totals from the backend (GET /api/v1/stats). Resolves to null when they are not available. */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    const res = await fetch(`${API}/stats`, { credentials: "include" });
    const data = await res.json();
    if (!res.ok || data?.success === false) return null;
    const fetches = Number(data.fetches);
    const downloads = Number(data.downloads);
    return Number.isFinite(fetches) && Number.isFinite(downloads) ? { fetches, downloads } : null;
  } catch {
    return null;
  }
}

/** 950, 1.2K, 34K, 2.1M: short enough for a footer. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const POLL_MS = 20_000;
const REFRESH_DELAY_MS = 900; // the backend counts a moment after the request, so wait a beat before asking

/**
 * The totals, kept live: loaded on mount, refreshed right after this visitor fetches or downloads something, and
 * polled every 20 seconds while the tab is visible so other visitors' activity shows up too.
 */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    let delayed: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      void getSiteStats().then((value) => {
        if (!cancelled && value) setStats(value);
      });
    };
    load();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const stopListening = onStatsChanged(() => {
      clearTimeout(delayed);
      delayed = setTimeout(load, REFRESH_DELAY_MS);
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(delayed);
      stopListening();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return stats;
}
