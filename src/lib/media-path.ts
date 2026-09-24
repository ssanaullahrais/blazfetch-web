/**
 * Stable paths for stored media, shared with the backend: `/youtube/<id>`, and for playlists
 * `/youtube/<id>/playlist/<listId>` or `/youtube/playlist/<listId>`. The page URL is the backend path.
 */

/** Every platform id the backend uses as the first path segment. */
export const PLATFORM_SLUGS = [
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "facebook",
  "vimeo",
  "reddit",
  "soundcloud",
  "pinterest",
  "snapchat",
  "dailymotion",
  "bluesky",
  "loom",
  "newgrounds",
  "rutube",
  "streamable",
  "twitch",
  "tumblr",
] as const;

const SLUGS = new Set<string>(PLATFORM_SLUGS);

/**
 * The stored-media path in a page URL, or null when the URL is not one (the home page, or any other
 * route). Returns it normalised: no query, no trailing slash, still percent-encoded.
 */
export function storedPathFromLocation(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  let first: string;
  try {
    first = decodeURIComponent(parts[0]);
  } catch {
    return null;
  }
  if (!SLUGS.has(first)) return null;
  const rest = parts.slice(1);
  const ok =
    rest.length === 1 ? rest[0] !== "playlist" : rest.length === 2 ? rest[0] === "playlist" : rest.length === 3 && rest[1] === "playlist";
  return ok ? `/${[first, ...rest].join("/")}` : null;
}

/** The shareable page URL for a stored path on this site. */
export function shareUrlForPath(origin: string, path: string | null | undefined, fallbackSourceUrl: string): string {
  return path ? `${origin}${path}` : `${origin}/?url=${encodeURIComponent(fallbackSourceUrl)}`;
}
