import { safeHref } from "@/lib/safe-url";
import { useEffect, useState } from "react";
import type * as React from "react";
import { getPlatforms } from "@/lib/api";
import { Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCount, SHOW_PLATFORM_DOWNLOADS, useSiteStats } from "@/lib/site-stats";

type Platform =
  | { slug: string; name: string; url: string; color: string; path: string; monogram?: undefined }
  | { slug: string; name: string; url: string; color: string; monogram: string; path?: undefined };

const platforms: Platform[] = [
  {
    slug: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/",
    color: "#FF0000",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12Z",
  },
  {
    slug: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/",
    color: "#00f2ea",
    path: "M16.6 5.8a4.6 4.6 0 0 1-3.3-1.4V16a5.6 5.6 0 1 1-4.8-5.5v2.7a2.9 2.9 0 1 0 2 2.8V2h2.7a4.6 4.6 0 0 0 3.4 4Z",
  },
  {
    slug: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/",
    color: "#E1306C",
    path: "M12 2.2c3.2 0 3.6 0 4.8.1 1.2 0 2 .2 2.8.5.8.3 1.4.7 2 1.3.6.6 1 1.2 1.3 2 .3.7.5 1.6.5 2.8.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c0 1.2-.2 2-.5 2.8a5.6 5.6 0 0 1-1.3 2c-.6.6-1.2 1-2 1.3-.7.3-1.6.5-2.8.5-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2 0-2-.2-2.8-.5a5.6 5.6 0 0 1-2-1.3 5.6 5.6 0 0 1-1.3-2c-.3-.7-.5-1.6-.5-2.8C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c0-1.2.2-2 .5-2.8.3-.8.7-1.4 1.3-2 .6-.6 1.2-1 2-1.3.7-.3 1.6-.5 2.8-.5C8.4 2.2 8.8 2.2 12 2.2Zm0 3a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Zm0 11.2a4.4 4.4 0 1 1 0-8.8 4.4 4.4 0 0 1 0 8.8Zm7-11.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z",
  },
  {
    slug: "x",
    name: "X / Twitter",
    url: "https://x.com/",
    color: "currentColor",
    path: "M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.6-6.9L4.2 22H1l8.1-9.3L.9 2H8l5 6.3Zm-1.2 18h1.7L6.4 4H4.6Z",
  },
  {
    slug: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/",
    color: "#1877F2",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
  },
  {
    slug: "vimeo",
    name: "Vimeo",
    url: "https://vimeo.com/",
    color: "#1AB7EA",
    path: "M22.4 6.2c-.1 2.2-1.6 5.1-4.6 8.9-3.1 3.9-5.7 5.9-7.8 5.9-1.3 0-2.4-1.2-3.3-3.6L5 12.3C4.4 9.9 3.7 8.7 3 8.7c-.1 0-.7.3-1.6 1L.6 8.4c1-.9 2.1-1.9 3.2-3C5.2 4 6.6 3.4 7.4 3.3c1.9-.2 3 1 3.5 3.7.5 2.8 1 4.8 1.3 5.7.7 1.6 1.5 2.4 2.4 2.4.7 0 1.7-1 3-3.2 1.3-2.1 2-3.7 2-4.8.2-1.8-.5-2.7-2-2.7-.7 0-1.5.2-2.3.5C16.9 1.3 19 .1 21.2.1c1.7 0 2.5.9 2.5 2.7 0 .5-.1 2-.3 3.4Z",
  },
  {
    slug: "reddit",
    name: "Reddit",
    url: "https://www.reddit.com/",
    color: "#FF4500",
    path: "M22 12a2 2 0 0 0-3.4-1.4 9.2 9.2 0 0 0-4.7-1.5l.9-3.8 2.7.6a1.4 1.4 0 1 0 .2-1l-3-.7a.5.5 0 0 0-.6.4l-1 4.5a9.2 9.2 0 0 0-4.7 1.5A2 2 0 1 0 5.8 14a4 4 0 0 0 0 .5c0 2.6 3.2 4.7 7.2 4.7s7.2-2.1 7.2-4.7v-.5A2 2 0 0 0 22 12Zm-13 1.5a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0Zm7 3.5c-.7.7-1.9 1-3 1s-2.4-.3-3-1a.4.4 0 0 1 .5-.6c.5.4 1.4.7 2.5.7s2-.3 2.5-.7a.4.4 0 0 1 .5.6Zm-.3-2.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z",
  },
  {
    slug: "soundcloud",
    name: "SoundCloud",
    url: "https://soundcloud.com/",
    color: "#FF5500",
    path: "M8.5 17h11a3.3 3.3 0 0 0 0-6.6 4.7 4.7 0 0 0-9-1.6 2.8 2.8 0 0 0-2 2.6c0 .2 0 .3.1.5A2.7 2.7 0 0 0 8.5 17Zm-2-6.5c.2 0 .3 0 .5.1V17h-.5a1.3 1.3 0 0 1 0-2.6V10.5Zm-2 1.4v3.9a1 1 0 0 1 0-2v-1.9Z",
  },
  {
    slug: "pinterest",
    name: "Pinterest",
    url: "https://www.pinterest.com/",
    color: "#E60023",
    path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z",
  },
  {
    slug: "snapchat",
    name: "Snapchat",
    url: "https://www.snapchat.com/",
    color: "#FFFC00",
    path: "M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z",
  },
  {
    slug: "dailymotion",
    name: "Dailymotion",
    url: "https://www.dailymotion.com/",
    // Dailymotion's real brand mark is black-on-white — like X/Twitter above,
    // that's invisible against this app's dark theme with a literal hex, so
    // it inherits the surrounding text color instead (adapts automatically).
    color: "currentColor",
    path: "M21.823 7.327a11.928 11.928 0 0 0-2.606-3.814 12.126 12.126 0 0 0-3.866-2.57A12.246 12.246 0 0 0 10.617 0H1.831a.602.602 0 0 0-.609.603v3.764c0 .162.064.312.179.426l4.164 4.123a.612.612 0 0 0 .439.177h4.56c.806 0 1.56.313 2.125.88.557.559.856 1.296.843 2.075-.029 1.571-1.343 2.849-2.931 2.849h-6.74a.613.613 0 0 0-.432.176.619.619 0 0 0-.178.427v3.764c0 .162.063.312.178.427l4.139 4.099a.647.647 0 0 0 .476.21h2.572a12.276 12.276 0 0 0 4.733-.945 12.145 12.145 0 0 0 3.866-2.571 11.959 11.959 0 0 0 2.607-3.813c.633-1.479.956-3.051.956-4.67 0-1.619-.321-3.19-.956-4.669l.001-.005ZM2.441 4.118V1.982l2.945 2.755.001 2.297-2.946-2.916Zm4.975 17.813-2.945-2.917v-2.137l2.945 2.755v2.299Zm-2.004-5.832h5.19c2.248 0 4.107-1.807 4.147-4.03a4.027 4.027 0 0 0-1.192-2.937 4.203 4.203 0 0 0-2.996-1.239H6.606V5.216h3.996c1.831 0 3.553.706 4.849 1.986a6.724 6.724 0 0 1-.152 9.736 6.875 6.875 0 0 1-4.697 1.84H8.275L5.412 16.1v-.001Zm15.289.1a10.753 10.753 0 0 1-2.345 3.431 10.91 10.91 0 0 1-3.48 2.314 11.018 11.018 0 0 1-4.26.847H8.633v-2.814h1.916c2.145 0 4.161-.802 5.675-2.254a7.88 7.88 0 0 0 2.451-5.728c0-2.177-.87-4.21-2.451-5.728-1.514-1.454-3.528-2.254-5.675-2.254h-4.16L3.383 1.202h7.234c1.479 0 2.911.285 4.259.847a10.957 10.957 0 0 1 3.48 2.313 10.769 10.769 0 0 1 2.345 3.432c.571 1.33.86 2.743.86 4.202 0 1.46-.289 2.873-.86 4.203Z",
  },
  {
    slug: "bluesky",
    name: "Bluesky",
    url: "https://bsky.app/",
    color: "#1185FE",
    path: "M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026",
  },
  {
    slug: "twitch",
    name: "Twitch",
    url: "https://www.twitch.tv/",
    color: "#9146FF",
    path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  },
  {
    slug: "tumblr",
    name: "Tumblr",
    url: "https://www.tumblr.com/",
    color: "#36465D",
    path: "M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178l.011.002z",
  },
  {
    slug: "loom",
    name: "Loom",
    url: "https://www.loom.com/",
    color: "#625DF5",
    path: "M24 10.665h-7.018l6.078-3.509-1.335-2.312-6.078 3.509 3.508-6.077L16.843.94l-3.508 6.077V0h-2.67v7.018L7.156.94 4.844 2.275l3.509 6.077-6.078-3.508L.94 7.156l6.078 3.509H0v2.67h7.017L.94 16.844l1.335 2.313 6.077-3.508-3.509 6.077 2.312 1.335 3.509-6.078V24h2.67v-7.017l3.508 6.077 2.312-1.335-3.509-6.078 6.078 3.509 1.335-2.313-6.077-3.508h7.017v-2.67H24zm-12 4.966a3.645 3.645 0 1 1 0-7.29 3.645 3.645 0 0 1 0 7.29z",
  },
  {
    slug: "newgrounds",
    name: "Newgrounds",
    url: "https://www.newgrounds.com/",
    color: "#F68315",
    path: "M1.187 3.236C.397 3.966.002 4.876.002 5.97v15.584c-.02.243.101.364.365.364H3.07c.243 0 .365-.121.365-.364V6.03c0-.405.212-.608.638-.608H6.29c.405 0 .608.203.608.608v15.523c0 .243.142.364.425.364h2.643c.243 0 .374-.121.395-.364V5.97c-.02-1.093-.415-2.005-1.185-2.734A4.047 4.047 0 0 0 6.29 2.082H4.073c-1.134 0-2.096.385-2.886 1.154m20.9 18.105c.263-.162.506-.344.728-.547.79-.77 1.185-1.68 1.185-2.734v-5.62c-.02-.263-.152-.394-.395-.394h-4.374c-.263 0-.395.131-.395.394v2.522c0 .263.132.395.395.395h.941c.244 0 .365.141.365.425v2.278c0 .385-.192.577-.577.577h-2.248c-.425 0-.638-.192-.638-.577V6.03c0-.404.213-.607.638-.607h2.248c.385 0 .577.203.577.608V8.34c-.02.243.111.374.395.394h2.673c.243-.02.375-.151.395-.394V5.97c0-1.073-.395-1.984-1.185-2.734-.81-.77-1.762-1.154-2.855-1.154h-2.248c-1.114 0-2.066.385-2.855 1.154-.83.75-1.236 1.66-1.216 2.734v12.09c-.02 1.053.385 1.965 1.216 2.734.222.203.465.385.729.547.627.385 1.336.577 2.126.577h2.248c.79 0 1.498-.192 2.126-.577Z",
  },
  {
    slug: "streamable",
    name: "Streamable",
    url: "https://streamable.com/",
    color: "#2FA1D6",
    monogram: "S",
  },
  {
    slug: "rutube",
    name: "Rutube",
    url: "https://rutube.ru/",
    color: "#1A1A1A",
    monogram: "R",
  },
];

/** The backend's GET /platforms list decides which platforms are shown (and
 * their labels); each is matched to a brand logo here, with a monogram badge
 * for any platform the backend adds that has no logo yet. Until it loads (or
 * if it fails) the built-in list is used. */
function usePlatformList(): Platform[] {
  const [list, setList] = useState<Platform[]>(platforms);
  useEffect(() => {
    let cancelled = false;
    getPlatforms()
      .then((remote) => {
        if (cancelled || remote.length === 0) return;
        setList(
          remote.map((r) => {
            const known = platformBySlug.get(r.id);
            const domain = r.domains[0];
            if (known) return { ...known, name: r.label };
            return {
              slug: r.id,
              name: r.label,
              url: domain ? `https://${domain}/` : "#",
              color: "#71717a",
              monogram: r.label.charAt(0).toUpperCase(),
            };
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

/** The backend counts X under its platform id "twitter"; the icon set keys it as "x". */
const BACKEND_ID_BY_SLUG: Record<string, string> = { x: "twitter" };

/** Downloads of one platform from the stats' per-platform map (0 when it has none yet), or undefined when unknown. */
function downloadsFor(counts: Record<string, number> | undefined, slug: string): number | undefined {
  if (!SHOW_PLATFORM_DOWNLOADS || !counts) return undefined;
  return counts[BACKEND_ID_BY_SLUG[slug] ?? slug] ?? 0;
}

export function PlatformIcons({ compact = false }: { compact?: boolean } = {}) {
  const platforms = usePlatformList();
  // One stats subscription for the whole grid (not one per icon); off entirely when the tooltips do not show it.
  const stats = useSiteStats();
  const counts = SHOW_PLATFORM_DOWNLOADS ? stats?.platforms : undefined;
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      {/* A static grid holds the full list while there's nothing else on
          screen yet; once a fetch result is showing below and space is at a
          premium, this switches to the compact scrolling marquee instead —
          at every screen size, not just mobile — and stays that way for as
          long as the result is shown. */}
      {compact ? (
        <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden py-1 sm:mx-0 sm:w-[32rem] sm:max-w-[calc(100vw-2rem)]">
          <div className="platform-marquee-track flex w-max items-center gap-5">
            {[...platforms, ...platforms].map((p, index) => (
              <PlatformLink
                key={`${p.slug}-${index}`}
                platform={p}
                downloads={downloadsFor(counts, p.slug)}
                className="w-16 shrink-0"
                aria-hidden={index >= platforms.length}
                tabIndex={index >= platforms.length ? -1 : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 items-center justify-items-center gap-x-4 gap-y-3 sm:hidden">
            {platforms.map((p) => (
              <PlatformLink key={p.name} platform={p} downloads={downloadsFor(counts, p.slug)} className="w-full" />
            ))}
          </div>
          <div className="hidden grid-cols-4 items-center justify-items-center gap-x-4 gap-y-3 sm:grid sm:grid-cols-6 sm:gap-x-6">
            {platforms.map((p) => (
              <PlatformLink key={p.name} platform={p} downloads={downloadsFor(counts, p.slug)} className="w-full" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlatformLink({
  platform: p,
  downloads,
  className = "",
  ...props
}: {
  platform: Platform;
  /** Total downloads of this platform, shown in the tooltip; undefined hides the line. */
  downloads?: number;
  className?: string;
} & Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, "aria-hidden" | "tabIndex">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={safeHref(p.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${p.name}`}
          className={`group flex flex-col items-center gap-1 rounded-sm opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
          {...props}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 transition group-hover:scale-110"
            style={{ fill: p.color }}
          >
            {p.monogram ? (
              <>
                <rect x="1" y="1" width="22" height="22" rx="5" />
                <text
                  x="12"
                  y="12.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fontWeight="700"
                  fill="#fff"
                >
                  {p.monogram}
                </text>
              </>
            ) : (
              <path d={p.path} />
            )}
          </svg>
          <span className="text-center text-[10px] leading-tight text-muted-foreground">{p.name}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-medium">{p.name}</span>
        {downloads !== undefined && (
          <span className="mt-0.5 flex items-center gap-1 text-muted-foreground">
            <Download className="size-3" aria-hidden />
            {formatCount(downloads)}
            <span className="sr-only">{downloads === 1 ? "download" : "downloads"}</span>
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

const platformBySlug = new Map(platforms.map((p) => [p.slug, p]));
// The backend reports X as "twitter" (its platform id); the icon set keys it as "x".
platformBySlug.set("twitter", platformBySlug.get("x")!);

/** The same real platform logos used on the homepage's platform grid, as a
 * small reusable icon by platform key (e.g. "youtube") — for badges, table
 * rows, and anywhere else in the dashboard that names a platform. Falls
 * back to a plain circle for a platform this map doesn't know about, so a
 * new/unrecognized string never crashes the row it's in. */
export function PlatformIcon({ platform, className = "size-3.5" }: { platform: string | null; className?: string }) {
  const p = platform ? platformBySlug.get(platform.toLowerCase()) : undefined;
  if (!p) {
    return <span className={`inline-block shrink-0 rounded-full bg-muted-foreground/30 ${className}`} />;
  }
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} style={{ fill: p.color }} aria-hidden="true">
      {p.monogram ? (
        <>
          <rect x="1" y="1" width="22" height="22" rx="5" />
          <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#fff">
            {p.monogram}
          </text>
        </>
      ) : (
        <path d={p.path} />
      )}
    </svg>
  );
}

export function platformDisplayName(platform: string | null) {
  if (!platform) return "Unknown";
  const p = platformBySlug.get(platform.toLowerCase());
  return p?.name ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Real brand color for a platform (falls back to a neutral gray) — used to
 * color chart bars/points the same way the platform's own icon is colored,
 * instead of an arbitrary chart palette. */
export function platformColor(platform: string | null) {
  if (!platform) return "#94a3b8";
  const p = platformBySlug.get(platform.toLowerCase());
  if (!p || p.color === "currentColor") return "#71717a";
  return p.color;
}

/** Icon + name together, the standard way to show "which platform" anywhere
 * in the dashboard (tables, cards, lists) instead of a plain colored text
 * badge. */
export function PlatformBadge({ platform, className = "" }: { platform: string | null; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}>
      <PlatformIcon platform={platform} />
      {platformDisplayName(platform)}
    </span>
  );
}
