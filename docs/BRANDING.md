# Branding, white label and SEO

Everything that carries the site's identity is defined in **one file**: [`src/config/site.ts`](../src/config/site.ts).
Change a value there, or set the matching `VITE_SITE_*` variable when you build, and it is replaced everywhere.

| Setting | Variable | Used for |
|---|---|---|
| `name` | `VITE_SITE_NAME` | Header logo text, hero title, browser tab title, share text, installed app name, all SEO tags |
| `tagline` | `VITE_SITE_TAGLINE` | The line under the title, the app description, the tab title |
| `description` | `VITE_SITE_DESCRIPTION` | Search result snippet, link previews (Open Graph and Twitter), structured data |
| `url` | `VITE_SITE_URL` | Canonical links, `sitemap.xml`, `robots.txt`, share images. Set this to your real domain |
| `keywords` | `VITE_SITE_KEYWORDS` | The keywords meta tag |
| `themeColor` | `VITE_SITE_THEME_COLOR` | Browser toolbar and installed-app splash colour |
| `language` | `VITE_SITE_LANGUAGE` | The page language (`en`, `fr`, ...) |
| `twitter` | `VITE_SITE_TWITTER` | Optional `@handle` for the Twitter/X card |

## White label in two minutes

```bash
VITE_SITE_NAME="My Saver" \
VITE_SITE_TAGLINE="Save any video in one tap." \
VITE_SITE_URL="https://saver.example.com" \
pnpm build
```

Or put the same lines in a `.env.production` file next to `package.json` (`VITE_SITE_NAME=My Saver`, and so on) and
run `pnpm build`. For local work use `.env.local`.

Then replace the artwork in `public/` with your own, keeping the file names:

| File | Size | Used for |
|---|---|---|
| `favicon.svg`, `favicon-32.png` | vector, 32 px | Browser tab |
| `apple-touch-icon.png` | 180 px | iPhone home screen |
| `icon-192.png`, `icon-512.png` | 192, 512 px | Installed app |
| `icon-maskable-512.png` | 512 px | Installed app on Android (keep the mark in the centre 60%) |
| `og-image.png` | 1200 x 630 px | Link previews on social networks and chat apps |

## The footer credit stays

The [license](../LICENSE) requires the footer credit ("Give a star on GitHub" and "Developed with ♥ by Sanaullah Rais")
to stay visible and unchanged. It is deliberately **not** configurable here, and `pnpm build` stops if it is removed.
You can restyle it (colour, size, position). To remove it you need the author's written permission.

## SEO: what is built in

- **Static tags** (in `index.html`, filled from `site.ts` at build time): title, description, keywords, canonical link,
  robots, Open Graph, Twitter card, and JSON-LD structured data (`WebApplication`).
- **Per-result tags:** when a video, audio or photo result is on screen, `applySeo()` in
  [`src/lib/seo.ts`](../src/lib/seo.ts) sets the tab title, description, canonical link to its stable page
  (for example `/youtube/<id>`), and the link-preview title, description and thumbnail. A removed video gets
  `noindex`. Going back to the home page restores the site-wide values.
- **`robots.txt` and `sitemap.xml`:** generated at build time from `url`. `/api/` is disallowed.
- **Installable app:** the web manifest uses the same name, tagline and theme colour.

### Things to know

- This is a single-page app: crawlers that do not run JavaScript see only the home page tags. Google runs JavaScript, so
  result pages can be indexed; social network previews of a result page use the home page image and text unless the
  crawler runs JavaScript. For per-page previews on every network you would need server-side rendering or a small
  Nginx rule, which this project does not include.
- After changing the site URL, submit the new `sitemap.xml` in Google Search Console.
- Your server must serve `/robots.txt` and `/sitemap.xml` from the built `dist/` folder (the Nginx setup in
  [DEPLOYMENT.md](DEPLOYMENT.md) already does).
