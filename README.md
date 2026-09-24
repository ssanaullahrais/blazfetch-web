<div align="center">

<img src="public/icon-192.png" alt="BlazFetch" width="88" height="88" />

# BlazFetch Frontend

**Paste a link. Pick a quality. Download.**<br/>
A fast, clean web app for saving video, audio and photos from 18 social platforms.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)
![Tests](https://img.shields.io/badge/tests-58%20passing-2EA44F)

[Backend repository](https://github.com/ssanaullahrais/blazfetch-api) ·
[Integration guide](docs/INTEGRATION.md) ·
[Deployment guide](docs/DEPLOYMENT.md)

</div>

---

> [!IMPORTANT]
> **This repository is the frontend only and needs the backend to work.**
> Get it here: **[ssanaullahrais/blazfetch-api](https://github.com/ssanaullahrais/blazfetch-api)**.
> Its README covers installing the system tools, choosing a database (SQLite, PostgreSQL, MySQL or MongoDB),
> platform support and the full API reference.

## Demo

<div align="center">

<a href="docs/media/demo.mp4"><img src="docs/media/demo.gif" alt="BlazFetch demo: paste a link, pick a quality, download" width="760" /></a>

<sub>Click the animation to open the full video ([demo.mp4](docs/media/demo.mp4)).</sub>

</div>

## Highlights

- **18 platforms, one input.** YouTube, TikTok, Instagram, X/Twitter, Facebook, Reddit, Vimeo, Dailymotion, Bluesky, Streamable, Rutube, SoundCloud, Snapchat, Twitch, Pinterest, Loom, Newgrounds and Tumblr.
- **Straight to your downloads folder.** Files go directly to the browser's download manager, so even large videos never sit in memory.
- **Shareable pages.** Every link gets a permanent address such as `/youtube/dQw4w9WgXcQ` that opens instantly.
- **Video, audio and photos.** Choose a quality, grab an MP3, preview a track, save a whole carousel or Pinterest board.
- **Honest errors.** Private, removed, age-restricted or region-locked media gets a clear explanation, never a raw error dump.
- **Light and dark themes,** installable as a PWA, fully responsive.

## Platform status

Every platform was tested with real downloads against the backend. The backend's
[API docs](https://github.com/ssanaullahrais/blazfetch-api/blob/master/docs/API.md#responses-by-platform)
show a real response for each one.

| Platform | Status | Notes |
|---|---|---|
| YouTube | ✅ Confirmed | Video and playlists. If YouTube temporarily blocks the server's IP, a fallback provider serves the request automatically |
| TikTok | ✅ Confirmed | Videos and slideshows |
| Instagram | ✅ Confirmed | Posts, reels and carousels (profile listing is not supported) |
| X / Twitter | ✅ Confirmed | Both `x.com` and `twitter.com` |
| Facebook | ✅ Confirmed | Reels and public videos. Posts that need a login return a clear error |
| Reddit | ✅ Confirmed | Including separate video and audio streams |
| Vimeo | ✅ Confirmed | DRM-protected videos return a clear error |
| Dailymotion | ✅ Confirmed | Some clips have no audio at the source |
| Bluesky | ✅ Confirmed | |
| Streamable | ✅ Confirmed | |
| Rutube | ✅ Confirmed | |
| SoundCloud | ✅ Confirmed (single track) | Audio only. Profile pages and DRM-protected (Go+) tracks are not supported |
| Snapchat | ✅ Confirmed | |
| Twitch | ✅ Confirmed | VODs, including 50+ minute recordings |
| Pinterest | ✅ Confirmed (pins and boards) | Large boards page through a range picker |
| Loom | ✅ Confirmed | Video and audio |
| Newgrounds | ✅ Confirmed | Public movies with a video |
| Tumblr | ⚠️ Wired, untested | |

The app also reads the live list from the backend (`GET /api/v1/platforms`) for its logo grid, and the health
button at the top right shows whether the backend is up.

## Quick start

**1. Start the backend** (see [its README](https://github.com/ssanaullahrais/blazfetch-api)):

```bash
git clone https://github.com/ssanaullahrais/blazfetch-api.git
cd blazfetch-api
# follow the Install section of its README, then:
npm run dev            # http://localhost:4000
```

**2. Start the frontend** (Node.js 20+ and [pnpm](https://pnpm.io) 10+):

```bash
git clone https://github.com/ssanaullahrais/blazfetch-web.git
cd blazfetch-web
pnpm install
pnpm dev               # http://localhost:3000
```

The dev server proxies `/api` and `/health` to `http://localhost:4000`, so local work needs no CORS setup.

## Features

| Feature | Notes |
|---|---|
| Paste button | With an empty box the button reads "Paste & Fetch": one tap pastes the copied link and fetches it (needs clipboard permission; otherwise long-press the box). Once a result is showing it reads "Paste Another". With text in the box it reads "Fetch". Same on every device |
| Fetch a link | Title, thumbnail, author and duration, with video and audio formats to choose from |
| Video and Audio (MP3) tabs | Each format shows quality, size and codec, with a details dialog. "Best quality" needs no choosing |
| Audio preview | Built in but off by default (see `VITE_ENABLE_AUDIO_PREVIEW`) |
| Playlists | YouTube playlists list every video; open one to fetch its formats |
| Carousels and galleries | Instagram carousels and Pinterest pins and boards: videos and images in separate tabs |
| Large boards | Pinterest board range picker |
| Downloads | Automatic delivery straight to the browser's download manager, with a live "Preparing…" then "Started" state |
| Stop | Cancels the download and the backend cleans up its processes |
| Refresh | Re-fetches a link and skips the backend's metadata cache |
| Stable pages | Each item's permanent path is put in the address bar and can be shared |
| Media store info | Download count, "May be outdated" (revalidation failed) and "Backup source" (fallback provider) badges, playlist page link |
| Unavailable media | A removed video (HTTP 410) shows a "No longer available" card with the reason and dates |
| Legacy share links | `/?url=<link>` still fetches on load |
| Pull to refresh | On phones, pull down from the top to show a circular loader; releasing reloads the app on the home screen with an empty link box |
| Settings | Default tab (video or audio), fetch on paste, sounds |

### Download methods

Automatic is always used for now. The other methods are built in and shown as "Soon" in Settings:

| Method | What it does |
|---|---|
| **Automatic** (active) | Streams instantly, and prepares on the server if streaming isn't possible |
| Fastest | Direct stream only |
| Compatible MP4 | Prepared on the server as H.264/AAC so it plays anywhere |
| With progress bar | Server prepares the file first and reports real progress |

To let visitors choose, build or run with `VITE_ENABLE_DOWNLOAD_METHODS=true`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | empty (same origin) | Set only when the API lives on another origin, e.g. `https://api.example.com`. Add this site to the backend's `CORS_ALLOWED_ORIGINS` |
| `VITE_ENABLE_AUDIO_PREVIEW` | off | `true` shows the play button on audio rows (previews are off because most audio is M4A/WebM) |
| `VITE_ENABLE_DOWNLOAD_METHODS` | off | `true` unlocks Fastest, Compatible MP4 and With progress bar in Settings |

The proxy target for `pnpm dev` and `pnpm preview` is in [vite.config.ts](vite.config.ts).

> [!TIP]
> Serve the app and `/api` from the **same origin** (see [Deployment](docs/DEPLOYMENT.md)). The app detects a
> started or failed download through a first-party cookie and the download frame, which needs same origin.
> Across origins downloads still work, but errors are not shown.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Unit tests (Vitest, using real backend responses as fixtures) |
| `pnpm typecheck` | TypeScript only |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |

## Project layout

```
src/
  components/
    home-page.tsx          search, result card, tabs, format rows, range picker
    settings-menu.tsx      download method and preferences popover
    unavailable-card.tsx   "No longer available" card for removed media
    download/              download button and stop dialog
    platform-icons.tsx     platform logos (all 18) and the backend-driven grid
    service-status.tsx     health button
    ui/                    shadcn/ui primitives
  lib/
    api.ts                 backend client: fetch, audio, stored media, platforms, health
    stream-download.ts     GET /stream downloads (hidden frame + start cookie)
    jobs.ts                POST /download, /jobs, /downloads (progress-bar method)
    errors.ts              ApiError, error codes to friendly text, tombstones
    media-path.ts          stable page paths (/youtube/<id>)
    preferences.ts         local preferences
docs/
  INTEGRATION.md           how the UI maps to each backend endpoint
  DEPLOYMENT.md            production build, Nginx, backend CORS
```

## Documentation

- [docs/INTEGRATION.md](docs/INTEGRATION.md): endpoint-by-endpoint mapping, data shapes and the download flow
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): building and serving with Nginx
- [Backend README](https://github.com/ssanaullahrais/blazfetch-api): backend setup and databases
- [Backend API reference](https://github.com/ssanaullahrais/blazfetch-api/blob/master/docs/API.md) and its OpenAPI file

## Troubleshooting

| Problem | Fix |
|---|---|
| Everything says "Failed to fetch" or the health button is red | The backend is not running or not on port 4000. Check `http://localhost:4000/health/ready` |
| CORS error when using `VITE_API_BASE` | Add this site's origin to the backend's `CORS_ALLOWED_ORIGINS` |
| A link errors | The backend reports the reason (private video, login required, region locked). Updating yt-dlp on the backend often fixes extractor errors |
| Download errors are not shown | The API is on another origin. Serve `/api` from the same origin |
| An image opens in a new tab instead of downloading | The source's CDN blocks reading the file from a browser. Save it from the new tab |

---

<div align="center">
Backend: <a href="https://github.com/ssanaullahrais/blazfetch-api">blazfetch-api</a>
</div>
