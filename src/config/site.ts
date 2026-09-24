/**
 * The one place that defines the site's identity. Change a value here (or set the matching VITE_SITE_* variable at
 * build time) and it is replaced everywhere: the header, page titles, the browser tab, share text, the installed
 * app name, and all SEO tags (description, Open Graph, Twitter, JSON-LD, sitemap, robots).
 *
 * This file is also read by vite.config.ts, so keep it free of imports from the app.
 *
 * The footer credit required by the LICENSE is deliberately NOT configurable from here.
 */
type Env = Record<string, string | undefined>;

/** Builds the site definition from build-time variables (VITE_SITE_*), falling back to the defaults below. */
export function createSite(env: Env) {
  const setting = (name: string, fallback: string): string => env[name] || fallback;
  return {
  /** The name shown everywhere. */
  name: setting("VITE_SITE_NAME", "BlazFetch"),
  /** One short line under the title and in the app description. */
  tagline: setting("VITE_SITE_TAGLINE", "Paste a link, save any video, audio or photo."),
  /** A longer sentence for search results and link previews (about 150 characters). */
  description: setting(
    "VITE_SITE_DESCRIPTION",
    "Download videos, audio and photos from YouTube, TikTok, Instagram, X, Facebook, Reddit, Vimeo and more. Paste a link, pick a quality, save it. Free, fast, no sign-up.",
  ),
  /** Public address of the site, without a trailing slash. Used for canonical links, the sitemap and share previews. */
  url: setting("VITE_SITE_URL", "https://social.blaztools.com").replace(/\/+$/, ""),
  /** Keywords for the meta tag (search engines mostly ignore them, some directories still read them). */
  keywords: setting(
    "VITE_SITE_KEYWORDS",
    "video downloader, social media downloader, YouTube downloader, TikTok downloader, Instagram downloader, mp4, mp3, save video, download audio",
  ),
  /** Colour of the browser toolbar and the installed app's splash screen. */
  themeColor: setting("VITE_SITE_THEME_COLOR", "#000000"),
  /** Language of the page (BCP 47). */
  language: setting("VITE_SITE_LANGUAGE", "en"),
  /** Optional Twitter/X handle, for example "@yourname". */
  twitter: setting("VITE_SITE_TWITTER", ""),
  } as const;
}

export type Site = ReturnType<typeof createSite>;

/** The site definition the app uses. */
export const site: Site = createSite((import.meta as unknown as { env?: Env }).env ?? {});

/** "Page title · Site name", or just the site name when there is no page title. */
export function pageTitle(title?: string | null): string {
  return title ? `${title} · ${site.name}` : site.name;
}
