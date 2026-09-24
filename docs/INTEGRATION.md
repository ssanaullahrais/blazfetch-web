# Backend integration

All calls go through [src/lib/api.ts](../src/lib/api.ts). Base path: `{VITE_API_BASE}/api/v1`. Requests send
credentials so the backend's guest cookie (`blazfetch_guest_id`) works. See the backend's `docs/API.md`
for the full request and response shapes.

## Endpoint map

| Backend endpoint | Used for | Frontend function |
|---|---|---|
| `POST /fetch` | Resolve a link: metadata, formats, carousels, playlists, boards. Sends `forceRefresh` (Refresh button) and `rangeStart` / `rangeEnd` (range picker) | `fetchInfo()` |
| `POST /fetch/audio` | Audio options, including the MP3-conversion option | `fetchInfo()` (called together with `/fetch` for video sources) |
| `POST /download` | Start a download job for a video, audio or carousel video | `startDownloadJob()` |
| `GET /jobs/:id` | Poll status and progress every second | `getDownloadJob()`, `waitForDownloadJob()` |
| `GET /downloads/:id` | The file itself (browser download, or audio preview) | `downloadJobFileUrl()`, `requestDownloadJobFile()` |
| `DELETE /downloads/:id` | Stop: cancels the job, ends yt-dlp/ffmpeg and removes temp files | `cancelDownloadJob()` |
| `GET /platforms` | Platform list for the logo grid | `getPlatforms()` |
| `GET /health/ready` | Status button | `getBackendHealth()` |

## Download flow

1. The user clicks Download on a format row. The frontend calls `POST /download` with `{ url, formatId, kind }`
   (`formatId` is omitted for "Best quality", which the backend resolves).
2. It polls `GET /jobs/:id` every second and shows the job's `progress` on the button ("Preparing…").
3. When the job is `ready` or `completed`, it starts the browser download from `GET /downloads/:id`. The backend
   sends `Content-Disposition: attachment`, so the page stays where it is.
4. Stop calls `DELETE /downloads/:id`.

Job states are mapped in `toJobStatus()`:

| Backend | UI |
|---|---|
| `queued` | queued |
| `preparing`, `streaming` | running (Preparing…) |
| `ready`, `completed` | ready (download starts) |
| `failed` | error (shows `errorMessage`) |
| `cancelled`, `expired` | cancelled |

The file is served once. The backend removes its temporary copy after it is sent, so a finished job cannot be
downloaded a second time.

## How responses are mapped to the UI

`fetchInfo()` turns the backend response into a `MediaInfo`:

- **Single video:** `formats[]` become video rows, highest resolution first, one row per resolution and container.
  `audioFormats[]` become audio rows, best bitrate first. HLS manifest entries and DRC variants are dropped.
- **No audio track at the source:** the `/fetch/audio` result contains a synthetic `mp3-from-<formatId>` option,
  which the backend converts with ffmpeg.
- **Playlist:** `playlist.items[]` become a list; opening an entry fetches that video.
- **Carousel / Pinterest board:** `items[]` are split into videos (downloaded through `/download` with the post URL
  and the item's own `formatId`) and images (saved from `items[].source` directly, because the backend does not
  proxy images). Board responses include `metadata.totalPinCount`, which drives the range picker.
- **Platform id:** the backend reports X as `twitter`; the logo set keys it as `x`, and both resolve to the X logo.

## Errors

The backend always returns `{ success: false, error: { code, message } }`. `request()` in `api.ts` throws an
`ApiError` with `code`, `message` and HTTP `status`. `friendlyError()` shortens common messages for toasts;
`UNSUPPORTED_PLATFORM` is shown as "Not supported". Codes: `UNSUPPORTED_PLATFORM`, `INVALID_URL`, `MEDIA_NOT_FOUND`,
`PRIVATE_MEDIA`, `LOGIN_REQUIRED`, `AGE_RESTRICTED`, `GEO_RESTRICTED`, `EXTRACTOR_FAILED`, `PLATFORM_RATE_LIMITED`,
`DOWNLOAD_FAILED`, `FORMAT_UNAVAILABLE`, `PROCESS_TIMEOUT`, `FILE_TOO_LARGE`, `SERVER_BUSY`, `VALIDATION_ERROR`,
`JOB_NOT_FOUND`.

Rate limits are per guest cookie: 30 fetches and 10 downloads per minute by default. Going over shows the
backend's message.

## Not included

- Accounts, login, dashboards and usage plans. The backend runs everyone as a guest.
- A download history. The backend does not store per-user lists.
- The filename-style preference no longer changes saved names: the backend chooses the filename.
