import { pageTitle, site } from "@/config/site";

type Seo = {
  /** Page title without the site name. Omit for the home page. */
  title?: string | null;
  description?: string | null;
  /** Absolute image URL for link previews. */
  image?: string | null;
  /** Path of the page on this site, for the canonical link (for example "/youtube/abc"). */
  path?: string | null;
  /** Ask search engines not to index this page (for example a removed video). */
  noindex?: boolean;
};

function setMeta(attr: "name" | "property", key: string, content: string | null): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/**
 * Keeps the page title, description, canonical link, Open Graph and Twitter tags in step with what is on screen, so a
 * shared or crawled link to a result carries that result's own name and description. With no arguments it restores the
 * site-wide defaults from `src/config/site.ts`.
 */
export function applySeo(seo: Seo = {}): void {
  const title = pageTitle(seo.title);
  const description = clip(seo.description?.trim() || (seo.title ? `${seo.title}: ${site.description}` : site.description), 200);
  const url = `${site.url}${seo.path && seo.path !== "/" ? seo.path : "/"}`;
  const image = seo.image || `${site.url}/og-image.png`;

  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "robots", seo.noindex ? "noindex, follow" : "index, follow");
  setCanonical(url);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);
}
