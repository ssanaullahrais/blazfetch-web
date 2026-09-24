# BlazFetch Frontend

The web app for BlazFetch. Paste a link from a social platform (YouTube, TikTok, Instagram, X/Twitter,
Facebook, Reddit, Vimeo, Dailymotion, Bluesky, Streamable, Rutube, SoundCloud, Snapchat, Twitch,
Pinterest, Loom, Newgrounds, Tumblr), see the video, audio or photos in it, and download them.

It is a React single-page app that talks to the
[BlazFetch backend](https://github.com/ssanaullahrais/blazfetch-social-downloader) over `/api/v1`.
It stores nothing on its own server: it is static files.

## Features

| Feature | Notes |
|---|---|
| Fetch a link | Title, thumbnail, author and duration, with video and audio formats to choose from |
| Video and Audio (MP3) tabs | Each format shows quality, size and codec, with a details dialog. "Best quality" needs no choosing |
| Audio preview | Play a track before downloading it |
| Playlists | YouTube playlists list every video; open one to fetch its formats |
| Carousels and galleries | Instagram carousels and Pinterest pins/boards: videos and images in separate tabs |
| Large boards | Pinterest board range picker (`rangeStart` / `rangeEnd`) |
| Download methods | Settings menu: Automatic (default), Fastest (direct stream), Compatible MP4 (H.264/AAC), or With progress bar (job flow). Downloads go straight to the browser's download manager, nothing is held in memory |
| Stop | Cancels the download and the backend cleans up its processes |
| Refresh | Re-fetches a link and skips the backend's metadata cache (`forceRefresh`) |
| Stable pages | Every fetched item gets a permanent path such as `/youtube/dQw4w9WgXcQ`. It is put in the address bar, can be shared and opens instantly from the backend's media store |
| Media store info | Download count badge, "May be outdated" (revalidation failed), "Backup source" (YouTube fallback provider), playlist page link |
| Unavailable media | A removed video (HTTP 410) shows a "No longer available" card with the reason and dates |
| Legacy share links | `/?url=<link>` still re-fetches on load |
| Platform logos | Driven by the backend's platform list, with brand logos for all 18 |
| Health button | Top right: "Healthy" or "Service unavailable" |
| Light / dark theme | Installable as a PWA |

## Requirements

- Node.js 20+ and [pnpm](https://pnpm.io) 10+
- A running BlazFetch backend (default `http://localhost:4000`), see its README

## Install and run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Start the backend first (`npm run dev` in the backend repo). The dev server proxies `/api` and
`/health` to `http://localhost:4000`, so there is no CORS setup for local work. The backend's
default `CORS_ALLOWED_ORIGINS` is `http://localhost:3000`, which matches this dev server.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | empty (same origin) | Set only when the API lives on another origin, e.g. `https://api.example.com`. Add this site to the backend's `CORS_ALLOWED_ORIGINS` |

The proxy target for `pnpm dev` and `pnpm preview` is in [vite.config.ts](vite.config.ts).

## Scripts

```
pnpm dev          start the dev server
pnpm build        type-check and build to dist/
pnpm preview      serve the production build locally
pnpm typecheck    TypeScript only
pnpm test         unit tests (Vitest, real backend response fixtures)
pnpm lint         ESLint
pnpm format       Prettier
```

## Project layout

```
src/
  components/
    home-page.tsx          home page: search, result card, tabs, format rows, range picker
    download/              download button and stop dialog
    platform-icons.tsx     platform logos (all 18) and the backend-driven platform grid
    service-status.tsx     health button
    share-menu.tsx, theme-toggle.tsx, format-details-dialog.tsx, ...
    ui/                    shadcn/ui primitives
  lib/
    api.ts                 backend client: fetch, audio, stored media, platforms, health
    stream-download.ts     GET /stream downloads (hidden frame + start cookie)
    jobs.ts                POST /download, /jobs, /downloads (progress-bar method)
    errors.ts              ApiError, error codes to friendly text, tombstones
    media-path.ts          stable page paths (/youtube/<id>)
    waitForDownloadJob.ts  job polling
    download.ts            hands the finished file to the browser
    preferences.ts         local preferences (download method, default tab, sound, ...)
docs/
  INTEGRATION.md           how the UI maps to each backend endpoint
  DEPLOYMENT.md            production build, Nginx, backend CORS
```

## Documentation

- [docs/INTEGRATION.md](docs/INTEGRATION.md): endpoint-by-endpoint mapping, data shapes and the download flow
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): building and serving with Nginx

## Troubleshooting

- **Everything says "Failed to fetch" or the health button is red:** the backend is not running or is not on port 4000. Check `http://localhost:4000/health/ready`.
- **Requests fail with a CORS error when using `VITE_API_BASE`:** add this site's origin to the backend's `CORS_ALLOWED_ORIGINS`.
- **A platform link errors:** the backend reports a specific reason (private video, login required, region locked) and it is shown as-is. Updating yt-dlp on the backend often fixes extractor errors.
- **Downloads or stored pages misbehave when the API is on another origin:** the app can only detect a started or failed download when `/api` is same origin (it reads the start cookie and the error page). Cross-origin still works but errors are not shown. Prefer same origin.
- **An image opens in a new tab instead of downloading:** the source's CDN blocks reading the file from a browser. Save it from the new tab.
