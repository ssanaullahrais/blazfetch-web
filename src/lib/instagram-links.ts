/** Names that follow instagram.com/ but are not a profile. */
const RESERVED = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "s", "web", "highlights"]);

export type InstagramProfileLink = { username: string; kind: "profile" | "stories" };

/**
 * Recognises an Instagram profile (`instagram.com/<user>/`) or its stories (`instagram.com/stories/<user>/`) link, so a profile
 * result can offer a Stories button and a stories result a Profile button. Anything else (a post, a reel, a highlight) is null.
 */
export function parseInstagramProfileLink(raw: string): InstagramProfileLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/^(www\.|m\.)?instagram\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const valid = (name: string | undefined): name is string => !!name && /^[A-Za-z0-9._]{1,30}$/.test(name);

  if (parts[0]?.toLowerCase() === "stories") {
    // stories/<user>[/<story id>] (highlights live under stories/highlights/<id>, which is not a profile)
    const storyIdOk = parts.length === 2 || (parts.length === 3 && /^\d+$/.test(parts[2]));
    return storyIdOk && valid(parts[1]) && !RESERVED.has(parts[1].toLowerCase()) ? { username: parts[1], kind: "stories" } : null;
  }
  return parts.length === 1 && valid(parts[0]) && !RESERVED.has(parts[0].toLowerCase()) ? { username: parts[0], kind: "profile" } : null;
}

export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export function instagramStoriesUrl(username: string): string {
  return `https://www.instagram.com/stories/${username}/`;
}
