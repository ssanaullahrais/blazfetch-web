# Security policy

## Reporting a problem

Please report security issues **privately**, not in a public issue. Use GitHub's private reporting
("Security" tab, then "Report a vulnerability") on this repository, or start a private conversation through
https://github.com/ssanaullahrais/blazfetch-web/discussions and ask for a private channel. Include what you found,
how to reproduce it and, if you can, a suggested fix. You will get an answer as soon as possible.

Never post secrets (API keys, Cloudflare Turnstile secret keys, database URLs) in issues, discussions or chats. If one
leaks, rotate it in its dashboard first.

## What this project already does

- **No unsafe HTML:** the app never inserts raw HTML, and links that come from data (the source link, platform links)
  are checked to be plain `http(s)` before they reach a page.
- **External links** open with `rel="noopener noreferrer"`.
- **No secrets in the browser:** the Cloudflare Turnstile site key is public by design and comes from the backend; the secret
  key exists only on the server. The app stores only display preferences in the browser.
- **Downloads:** files go straight to the browser's download manager; nothing is kept in memory or on disk by the app.

## What you must do when you deploy

- Serve the app and `/api` from the same HTTPS domain (see docs/DEPLOYMENT.md), and add the security headers shown there.
- Keep dependencies updated (`pnpm audit`).

