# Deployment

The app is a static Vite build plus one Cloudflare Pages Function, deployed as a
single Cloudflare Pages project.

## Production

- Project: `undercover-game`
- Domain: `undercover.umeh.me`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20

## Secrets

Three, set in the Pages dashboard under **Settings → Variables and Secrets**
with the **Encrypt** option on, for both the Production and Preview
environments:

| Name | Example | Purpose |
|---|---|---|
| `AI_BASE_URL` | `https://9router.umeh.me/v1` | Any OpenAI-compatible endpoint |
| `AI_API_KEY` | — | Bearer token for that endpoint |
| `AI_MODEL` | — | Model name the endpoint expects |

None reach the browser — only `functions/api/words.ts` reads them, via
`context.env`.

Because the provider is configuration, switching from 9router to OpenAI direct
(or anywhere else) is three dashboard edits and a redeploy. No code change.

## Deploying

Pushes to `main` deploy automatically through the Git integration. To deploy by
hand:

```bash
npm run build
npx wrangler pages deploy dist --project-name=undercover-game
```

## Local development

The Vite dev server does not serve `/api/words`. Two terminals:

```bash
npm run dev        # Vite on :5173
npm run dev:pages  # wrangler proxying Vite, on :8788
```

Develop against **http://localhost:8788**. Opening :5173 works for UI, but every
call to `/api/words` will 404.

Put the three values in `.dev.vars` (gitignored):

```
AI_BASE_URL=https://9router.umeh.me/v1
AI_API_KEY=...
AI_MODEL=...
```

## Known limits

`/api/words` is public and unauthenticated. The Workers free plan caps the
account at 100,000 requests/day, which at roughly $0.001 per generation bounds
worst-case spend at about $90/day. That cap is shared with every other Worker
and Pages Function on the account, including the portfolio site on the apex.

Note that `AI_API_KEY` reaches a router that fans out to many providers, so a
drain here is not scoped to one provider's quota.

If abuse becomes a problem: set a spend cap on the upstream provider account (no
code), add a WAF rate-limiting rule on `/api/words` (free plan allows one rule,
path-only, IP-keyed, fixed 10s window), or add Turnstile.
