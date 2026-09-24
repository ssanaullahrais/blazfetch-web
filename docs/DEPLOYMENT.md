# Deployment

Deploy the backend first: see the
[backend repository](https://github.com/ssanaullahrais/blazfetch-api) and its VPS guide.

The frontend builds to static files. Serve them with Nginx and route `/api` and `/health` to the backend
on the same domain, so the browser needs no CORS setup and the guest cookie stays first-party.

## 1. Build

```bash
pnpm install --frozen-lockfile
pnpm build          # output in dist/
```

Copy `dist/` to the server, e.g. `/var/www/blazfetch`.

## 2. Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/blazfetch;
    index index.html;

    # Single-page app: unknown paths serve index.html. This also serves stable
    # pages such as /youtube/<id>, so keep this fallback
    location / {
        try_files $uri /index.html;
    }

    # Backend API (files are streamed, so do not buffer them)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 900s;
        client_max_body_size 1m;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

Keep `/api` on the same origin as the site: the app detects started and failed downloads through the
first-party start cookie and the frame's error page, which needs same origin.

Then add HTTPS with `sudo certbot --nginx -d example.com`. With this same-domain setup the backend needs no
CORS change.

## 3. Separate API domain (optional)

Build with the API address baked in:

```bash
VITE_API_BASE=https://api.example.com pnpm build
```

Add the site's origin to the backend's `CORS_ALLOWED_ORIGINS` (for example `https://example.com`). The backend
already sends credentialed CORS headers. Serve both over HTTPS so the guest cookie is accepted.

## Updating

```bash
git pull && pnpm install --frozen-lockfile && pnpm build
```

Copy the new `dist/` over the old one. The app registers a service worker that updates itself, so returning
visitors get the new version on their next load.

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page on a stable link such as `/youtube/<id>` after reload | Nginx must fall back to `index.html` (`try_files $uri /index.html`). |
| Every request fails or the status button is red | `/api` and `/health` must be proxied to the backend. Check `https://your-domain/health/ready`. |
| Downloads start but errors are never shown | The API is on another origin. Serve `/api` from the same domain. |
| Downloads cut off or hang | `proxy_buffering off` and a long `proxy_read_timeout` on `/api/`. |
| A fix on the backend does not show for a link you already fetched | Results are stored. Click **Refresh** on the result once. |
| Video plays black on a phone | Backend issue, fixed by updating it and using `DEFAULT_DOWNLOAD_MODE=auto`. See the backend's VPS guide. |

## License

Open source (MIT with required attribution). Anyone may use, modify and deploy it, including commercially, as long
as the footer credit ("Open source on GitHub" and "Developed with ♥ by Sanaullah Rais") stays visible. The build fails
if it is removed. See [LICENSE](../LICENSE) and [AGENTS.md](../AGENTS.md).
