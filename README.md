# BlazFetch Frontend

React + Vite + Tailwind frontend for the BlazFetch downloader. Talks to the backend at
https://github.com/ssanaullahrais/blazfetch-social-downloader (`/api/v1`).

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000 (proxies /api and /health to http://localhost:4000)
```

Start the backend first (`npm run dev` in the backend repo). To use an API on another origin, set
`VITE_API_BASE` and add this site to the backend's `CORS_ALLOWED_ORIGINS`.

## Scripts

`pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm preview`

## Layout

- `src/lib/api.ts`: backend client (fetch, audio, jobs, platforms, health)
- `src/components/home-page.tsx`: home page, result card, video/audio/image tabs
- `src/components/download/`: download button and stop dialog
