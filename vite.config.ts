import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { createSite, type Site } from "./src/config/site"

const escapeAttr = (text: string): string => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Fills the %SITE_*% placeholders in index.html and writes robots.txt and sitemap.xml from src/config/site.ts. */
function siteIdentity(site: Site, pwaEnabled: boolean): Plugin {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: site.name,
    description: site.description,
    url: `${site.url}/`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }).replace(/</g, "\u003c");
  const values: Record<string, string> = {
    SITE_NAME: escapeAttr(site.name),
    SITE_TAGLINE: escapeAttr(site.tagline),
    SITE_DESCRIPTION: escapeAttr(site.description),
    SITE_KEYWORDS: escapeAttr(site.keywords),
    SITE_URL: site.url,
    SITE_THEME_COLOR: site.themeColor,
    SITE_LANGUAGE: site.language,
    SITE_TWITTER_TAG: site.twitter ? `<meta name="twitter:site" content="${escapeAttr(site.twitter)}" />` : "",
    SITE_JSON_LD: jsonLd,
    // Home-screen launches open without browser chrome on iOS only while the app is offered as a PWA.
    SITE_PWA_META: pwaEnabled
      ? `<meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
      : "",
  };
  return {
    name: "site-identity",
    transformIndexHtml: (html) => html.replace(/%(SITE_[A-Z_]+)%/g, (whole, key: string) => values[key] ?? whole),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${site.url}/sitemap.xml
`,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.url}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  const site = createSite(env);
  // VITE_ENABLE_PWA=false turns the installable app and offline shell off. Keep the same value in src/lib/pwa.ts.
  const pwaEnabled = env.VITE_ENABLE_PWA !== "false";
  return {
  plugins: [
    react(),
    tailwindcss(),
    siteIdentity(site, pwaEnabled),
    VitePWA({
      // A new version takes over as soon as it has downloaded (skipWaiting + clientsClaim), so the next reload always
      // shows it, even on a tab opened from an old build. The open page is never reloaded by itself (that would cut
      // off a download): src/components/pwa-update-prompt.tsx offers the reload instead.
      registerType: "autoUpdate",
      // Registered from the app (src/lib/pwa.ts), not by an injected script.
      injectRegister: false,
      // With the PWA off, sw.js is still published, as a worker that unregisters itself and deletes its caches.
      // Visitors who installed an earlier build pick it up on their next visit and go back to a plain website.
      selfDestroying: !pwaEnabled,
      // Never precache/intercept API calls — this app is almost entirely
      // live data (fetch results, download progress);
      // caching any of that would mean serving stale or wrong data offline
      // instead of just failing honestly. With no `runtimeCaching` entry
      // for /api/*, the service worker never touches those requests at
      // all — they go straight to the network exactly as if it weren't
      // there. Only the static app shell (JS/CSS/fonts/icons) is precached,
      // which is what actually makes the app open instantly and feel native
      // on a phone instead of showing a blank white screen while it
      // refetches its own JS bundle on a slow connection.
      workbox: {
        // Opening robots.txt or sitemap.xml in the browser must show the file, not the app.
        navigateFallbackDenylist: [/^\/api\//, /^\/health/, /^\/robots\.txt$/, /^\/sitemap\.xml$/],
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
        // Only link-preview crawlers read the share image, and vite.svg is unused, so neither is kept offline.
        globIgnores: ["og-image.png", "vite.svg"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      // The icons already match globPatterns above; listing them again would precache them twice.
      includeManifestIcons: false,
      manifest: pwaEnabled
        ? {
            id: "/",
            name: site.name,
            short_name: site.name,
            description: site.tagline,
            lang: site.language,
            start_url: "/",
            scope: "/",
            display: "standalone",
            background_color: site.themeColor,
            theme_color: site.themeColor,
            categories: ["utilities", "multimedia"],
            icons: [
              { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          }
        : false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // `vite preview` (used to serve the production build) reads its own proxy
  // config, separate from `server.proxy` above which only applies to `vite
  // dev` — without this, the built frontend can't reach the API at all.
  // Points at the production backend's own port (8788), separate from dev's
  // 8787, so dev and a production smoke-test can run side by side.
  preview: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
}
})
