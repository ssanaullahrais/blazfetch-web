# Backend integration

All calls go through [src/lib/api.ts](../src/lib/api.ts). Base path: `{VITE_API_BASE}/api/v1`. Requests send
credentials so the backend's guest cookie (`blazfetch_guest_id`) works. See the
[backend repository](https://github.com/ssanaullahrais/blazfetch-api) and its `docs/API.md` (and
`docs/openapi.yaml`) for the full request and response shapes, with a real response for every platform.

## Endpoint map

| Backend endpoint | Used for | Frontend function |
|---|---|---|
| `POST /fetch` | Resolve a link: metadata, formats, carousels, playlists, boards. Sends `forceRefresh` (Refresh button) and `rangeStart` / `rangeEnd` (range picker) | `fetchInfo()` |
| `POST /fetch/audio` | Audio options, including the MP3-conversion option | `fetchInfo()` (called together with `/fetch` for video sources) |
| `GET /media/<platform>/<id>` (and `/playlist/<id>`) | Open a stored page by its stable path, no re-extraction. 410 `MEDIA_UNAVAILABLE` carries a tombstone | `getStoredMedia()` |
| `GET /stream?url&kind&formatId&filename&mode&token` | One-request download (default for Download). `mode` is `auto`, `stream` or `prepare` | `startBrowserDownload()`, `fetchStreamBlob()` |
| `POST /download` | Job-based download flow, used for the Compatible delivery method | `startDownloadJob()` |
| `GET /jobs/:id` | Poll status and progress every second | `getDownloadJob()`, `waitForDownloadJob()` |
| `GET /downloads/:id` | The file itself (browser download, or audio preview) | `downloadJobFileUrl()`, `requestDownloadJobFile()` |
| `DELETE /downloads/:id` | Stop: cancels the job, ends yt-dlp/ffmpeg and removes temp files | `cancelDownloadJob()` |
| `GET /stats` | The footer counters (all-time successful fetches and downloads) and each social icon's download count (`platforms`, per platform id) | `getSiteStats()` |
| `GET /stats/events` | Live committed totals over server-sent events; reconnects after interruptions | `watchSiteStats()` |
| `GET /platforms` | Platform list for the logo grid | `getPlatforms()` |
| `GET /health/ready` | Status button | `getBackendHealth()` |

## Download flow

Default (`GET /stream`): the app navigates a hidden frame to the stream URL with a random `token`, so the browser
download manager takes over and nothing is buffered in memory. The backend sets the cookie
`blazfetch_dl_<token>` once bytes flow; the app polls for it to show "Started". If the frame instead shows a JSON
error, the app reads it and shows the friendly message. Stop removes the frame, which ends the server's processes.
The delivery mode comes from Settings: Automatic (`auto`) and Fastest (`stream`) use this request; Compatible
uses the job flow below. Which of them Settings offers is set with `VITE_DOWNLOAD_METHODS` (default: all three). Audio previews use `fetch` and a blob.
If the API is on another origin the frame cannot be observed, so the app falls back to plain navigation.

Compatible (`POST /download`, the job flow with a real progress bar):

1. The user clicks Download on a format row. The frontend calls `POST /download` with
   `{ url, formatId, kind, filename }` (`formatId` is omitted for "Best quality", which the backend resolves;
   `filename` is the same name the other methods use, without extension).
2. It polls `GET /jobs/:id` every second and shows the job's `progress` on the button ("Preparing…"). The backend's
   progress covers the whole job: the download up to 90%, then the conversion to H.264/AAC (when the source needs
   one) up to 99%.
3. When the job is `ready` or `completed`, it starts the browser download from `GET /downloads/:id`. The backend
   sends `Content-Disposition: attachment` with the file's title, so the page stays where it is.
4. Stop calls `DELETE /downloads/:id`.

Job states are mapped in `toJobStatus()`:

| Backend | UI |
|---|---|
| `queued` | queued |
| `preparing`, `streaming` | running (Preparing…) |
| `ready`, `completed` | ready (download starts) |
| `failed` | error (shows `errorMessage`) |
| `cancelled`, `expired` | cancelled |

The job file answers `Range` requests, so a download the browser lost halfway (common on phones) resumes. The backend
removes its temporary copy once the last byte has been sent, so a finished job cannot be downloaded a second time.

## How responses are mapped to the UI

`fetchInfo()` turns the backend response into a `MediaInfo`:

- **Single video:** `formats[]` become video rows (`dedupeVideoFormats()`), highest resolution first, one row per
  resolution and container. For each, an H.264 format wins, then the plain file over an HLS copy (YouTube lists
  both at most qualities; the copy has no size), then one with a known size. `audioFormats[]` become audio rows,
  best bitrate first. DRC variants are dropped.
- **Row order:** the list shows the first 8 video and 5 audio rows. "Sort video by smallest size" and "Sort audio by
  compatibility" only reorder those rows (`src/lib/format-order.ts`); they never swap in other formats.
- **Audio as MP3:** when the backend runs with `AUDIO_FORCE_MP3=true` (the recommended setting in its `.env.example`), every entry of `audioFormats[]`
  arrives as `ext: "mp3"` with `isConverted: true` and an estimated size, so the audio tab lists MP3 rows and the file is named `.mp3`. The
  app needs no setting for it. With `VITE_ENABLE_AUDIO_PREVIEW=true` the play button works on every row.
- **No audio track at the source:** the `/fetch/audio` result contains a synthetic `mp3-from-<formatId>` option,
  which the backend converts with ffmpeg.
- **Playlist:** `playlist.items[]` become a list; opening an entry fetches that video.
- **Stored info:** `stored` gives the stable `path`, `playlistPath`, `cached`, `validationFailed` and `stats`; `fallbackUsed` names the YouTube fallback provider when it served the result.
- **Carousel / Pinterest board:** `items[]` are split into videos (downloaded through `/stream` in `prepare` mode with the post URL
  and the item's own `formatId`) and images (saved from `items[].source` directly, because the backend does not
  proxy images). Board responses include `metadata.totalPinCount`, which drives the range picker.
- **Platform id:** the backend reports X as `twitter`; the logo set keys it as `x`, and both resolve to the X logo.

## Cloudflare Turnstile (optional bot check)

Turnstile is switched on and off in the **backend's** `.env` (`TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`); the frontend needs no setting of its own. It reads the public site key from
`GET /api/v1/config` when the page loads and shows nothing at all when the check is off.

When it is on:

1. The home page loads without a challenge. A lookup, stored-media API request (`/youtube/<id>`) or download waits
   for a pass; stored-media requests can trigger backend extraction too.
2. [`TurnstileWidget`](../src/components/turnstile-widget.tsx) then draws the Cloudflare widget below the platform
   carousel, where the result card appears, in `interaction-only` mode: most visitors see nothing. If Cloudflare needs a
   click, Cloudflare shows the challenge. A slow check displays a prompt after six seconds without restarting it. The link stays in the search box the
   whole time. The light widget is used on both themes.
3. The solved token goes to `POST /api/v1/turnstile/verify`; the backend validates it with Cloudflare and sets a signed
   pass cookie (30 minutes by default). **Once the check is passed the widget is removed from the page.** When the pass
   expires, the check waits until the next fetch or download.
4. If the widget fails (blocked, offline, wrong domain) the visitor sees a message and a **Try again** button.
5. [`request()`](../src/lib/api.ts) (fetch, media and download calls), `startBrowserDownload()` and `fetchStreamBlob()` wait for
   the pass first, and retry once if the backend answers `403 TURNSTILE_REQUIRED`. State lives in
   [`src/lib/turnstile.ts`](../src/lib/turnstile.ts) (`idle`, `needed`, `verifying`, `passed`, `error`, `off`).

Same origin is recommended (see [DEPLOYMENT.md](DEPLOYMENT.md)): the pass is an HttpOnly cookie, and downloads are plain
browser navigations that carry it. For local testing use Cloudflare's dummy keys (they always pass on localhost):
site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`. The widget's hostname list in the
Cloudflare dashboard must include your domain (and `localhost` for real keys used locally).

Configuration or validation outages fail closed and can be retried. The backend can additionally check
`TURNSTILE_ALLOWED_HOSTNAMES` and `TURNSTILE_EXPECTED_ACTION`; the configured action is passed to the widget.
The signed pass is an application session, not a Cloudflare token reused for multiple Siteverify requests.
See Cloudflare's [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
and [widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/) documentation.

The stats event stream updates after committed writes. It checks for writes by other backend workers every two
seconds. Keep buffering disabled for `/api/v1/stats/events`; the backend sends `X-Accel-Buffering: no`.
The UI retains the last valid totals through temporary outages and reconnects when a hidden tab becomes visible.

## Errors

The backend always returns `{ success: false, error: { code, message } }`. `request()` in `api.ts` throws an
`ApiError` with `code`, `message` and HTTP `status`. `friendlyErrorFor()` turns codes into plain wording for toasts. Codes: `UNSUPPORTED_PLATFORM`, `INVALID_URL`, `MEDIA_NOT_FOUND`,
`PRIVATE_MEDIA`, `LOGIN_REQUIRED`, `AGE_RESTRICTED`, `GEO_RESTRICTED`, `EXTRACTOR_FAILED`, `PLATFORM_RATE_LIMITED`,
`DOWNLOAD_FAILED`, `FORMAT_UNAVAILABLE`, `PROCESS_TIMEOUT`, `FILE_TOO_LARGE`, `SERVER_BUSY`, `VALIDATION_ERROR`,
`JOB_NOT_FOUND`, `MEDIA_UNAVAILABLE` (410, removed media, with `details.tombstone`). Mapping lives in
`src/lib/errors.ts`.

Rate limits are per guest cookie: 30 fetches and 10 downloads per minute by default. Going over shows the
backend's message.

## Not included

- Accounts, login, dashboards and usage plans. The backend runs everyone as a guest.
- A download history. The backend does not store per-user lists.
- The filename-style preference no longer changes saved names: the backend chooses the filename.

## Tests

`pnpm test` runs Vitest against real backend responses (`src/lib/__fixtures__`), covering response mapping, errors, stable paths and the stream download logic.

## License

Free to use, modify and deploy, but **not to sell**, and the footer credit ("Give a star on GitHub" and "Developed with ♥ by
Sanaullah Rais") must stay visible. The build fails if it is removed. See [LICENSE](../LICENSE) and [AGENTS.md](../AGENTS.md).
