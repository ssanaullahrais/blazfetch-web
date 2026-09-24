import { useEffect, useState } from "react";
import { API } from "@/lib/api";

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

/** The totals, loaded once when the component mounts. */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getSiteStats().then((value) => {
      if (!cancelled) setStats(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}
