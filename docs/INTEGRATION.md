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
| `POST /download` | Job flow, used by the "With progress bar" method | `startDownloadJob()` |
| `GET /jobs/:id` | Poll status and progress every second | `getDownloadJob()`, `waitForDownloadJob()` |
| `GET /downloads/:id` | The file itself (browser download, or audio preview) | `downloadJobFileUrl()`, `requestDownloadJobFile()` |
| `DELETE /downloads/:id` | Stop: cancels the job, ends yt-dlp/ffmpeg and removes temp files | `cancelDownloadJob()` |
| `GET /platforms` | Platform list for the logo grid | `getPlatforms()` |
| `GET /health/ready` | Status button | `getBackendHealth()` |

## Download flow

Default (`GET /stream`): the app navigates a hidden frame to the stream URL with a random `token`, so the browser
download manager takes over and nothing is buffered in memory. The backend sets the cookie
`blazfetch_dl_<token>` once bytes flow; the app polls for it to show "Started". If the frame instead shows a JSON
error, the app reads it and shows the friendly message. Stop removes the frame, which ends the server's processes.
The delivery mode comes from Settings (`auto`, `stream`, `prepare`). Audio previews use `fetch` and a blob.
If the API is on another origin the frame cannot be observed, so the app falls back to plain navigation.

Progress-bar method (`POST /download`):

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

The job file is served once. The backend removes its temporary copy after it is sent, so a finished job cannot be
downloaded a second time.

## How responses are mapped to the UI

`fetchInfo()` turns the backend response into a `MediaInfo`:

- **Single video:** `formats[]` become video rows, highest resolution first, one row per resolution and container.
  `audioFormats[]` become audio rows, best bitrate first. HLS manifest entries and DRC variants are dropped.
- **No audio track at the source:** the `/fetch/audio` result contains a synthetic `mp3-from-<formatId>` option,
  which the backend converts with ffmpeg.
- **Playlist:** `playlist.items[]` become a list; opening an entry fetches that video.
- **Stored info:** `stored` gives the stable `path`, `playlistPath`, `cached`, `validationFailed` and `stats`; `fallbackUsed` names the YouTube fallback provider when it served the result.
- **Carousel / Pinterest board:** `items[]` are split into videos (downloaded through `/stream` in `prepare` mode with the post URL
  and the item's own `formatId`) and images (saved from `items[].source` directly, because the backend does not
  proxy images). Board responses include `metadata.totalPinCount`, which drives the range picker.
- **Platform id:** the backend reports X as `twitter`; the logo set keys it as `x`, and both resolve to the X logo.

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

Open source (MIT with required attribution). Anyone may use, modify and deploy it, including commercially, as long
as the footer credit ("Open source on GitHub" and "Developed with ♥ by Sanaullah Rais") stays visible. The build fails
if it is removed. See [LICENSE](../LICENSE) and [AGENTS.md](../AGENTS.md).
