import { Download, ExternalLink, Search, Users } from "lucide-react";
import { formatCount, SHOW_DOWNLOAD_STATS, SHOW_FETCH_STATS, SHOW_ONLINE_VISITORS, useSiteStats } from "@/lib/site-stats";

// eslint-disable-next-line react-refresh/only-export-components -- plain constants, not components
export const REPOS = [
  { name: "Frontend", detail: "blazfetch-web", url: "https://github.com/ssanaullahrais/blazfetch-web" },
  { name: "Backend API", detail: "blazfetch-api", url: "https://github.com/ssanaullahrais/blazfetch-api" },
] as const;

/** The backend's API reference, linked from the menu. */
export const API_DOCS_URL = "https://github.com/ssanaullahrais/blazfetch-api/blob/master/docs/API.md";

/** lucide has no brand icons, so the GitHub mark is inline. */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** An 8-bit heart drawn from square pixels, blinking in two steps like an old arcade game. */
function PixelHeart() {
  const pixels = [
    [1, 0], [2, 0], [4, 0], [5, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
    [2, 4], [3, 4], [4, 4],
    [3, 5],
  ];
  return (
    <svg
      viewBox="0 0 7 6"
      className="size-3.5 animate-[pulse_1.2s_steps(2,end)_infinite] text-red-500"
      fill="currentColor"
      shapeRendering="crispEdges"
      role="img"
      aria-label="love"
    >
      {pixels.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

/** Centered footer: the GitHub link and the credit, side by side with a separator on wide screens and stacked on phones. It opens the
 * project's main repository, whose README links the backend too. */
/** Which of the three public counters to actually draw, and the sentence describing them — each one
 * individually switched off with VITE_SHOW_FETCH_STATS / VITE_SHOW_DOWNLOAD_STATS / VITE_SHOW_ONLINE_VISITORS
 * (all "on" unless explicitly set to "false"). Returns null when there is nothing left to show at all, so
 * the row (and its leading separator) doesn't render as an empty line. */
function useStatsLine() {
  const stats = useSiteStats();
  if (!stats) return null;
  const items = [
    SHOW_FETCH_STATS && { key: "fetches", icon: Search, value: stats.fetches, label: "fetches" },
    SHOW_DOWNLOAD_STATS && { key: "downloads", icon: Download, value: stats.downloads, label: "downloads" },
    // Older backends don't send `online` yet — nothing to show until they do, same as a hidden flag.
    SHOW_ONLINE_VISITORS && stats.online !== undefined && { key: "online", icon: Users, value: stats.online, label: "online now" },
  ].filter((item): item is { key: string; icon: typeof Search; value: number; label: string } => !!item);
  if (items.length === 0) return null;
  return {
    items,
    description: items.map((item) => `${item.value.toLocaleString()} ${item.label}`).join(", "),
  };
}

export function GithubFooter() {
  const statsLine = useStatsLine();
  return (
    <footer className="absolute inset-x-0 bottom-0 text-xs text-muted-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-1 px-4 py-4 sm:flex-row sm:gap-x-3">
        <a
          href={REPOS[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 underline-offset-4 transition hover:text-foreground hover:underline"
        >
          <GithubMark className="size-3.5" />
          Give a star on GitHub
          <ExternalLink className="size-3" />
        </a>
        <span aria-hidden className="hidden text-muted-foreground/50 sm:inline">|</span>
        <p className="inline-flex items-center gap-1">
          Developed with <PixelHeart /> by Sanaullah Rais
        </p>
        {statsLine && (
          <>
            <span aria-hidden className="hidden text-muted-foreground/50 sm:inline">|</span>
            <p
              className="mt-2 inline-flex items-center gap-2.5 sm:mt-0"
              title={statsLine.description}
              aria-label={statsLine.description}
            >
              {statsLine.items.map((item, i) => (
                <span key={item.key} className="inline-flex items-center gap-2.5">
                  {i > 0 && <span aria-hidden>·</span>}
                  <span className="inline-flex items-center gap-1">
                    <item.icon className="size-3.5" aria-hidden />
                    {formatCount(item.value)}
                  </span>
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </footer>
  );
}
