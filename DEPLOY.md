# Deploying StockHub to your own hosting

The frontend and the database are separate. The app talks to your Supabase
project directly from the browser, so hosting it only means serving this app —
there is nothing else to install or connect on the server.

## What you need

- Node 22 (or Bun) on the host
- This repository

## Option A — Vercel (what you used before)

Vercel sets `VERCEL=1` automatically, so the plain build command produces the
Vercel output.

1. Import the repository into Vercel.
2. Build settings — these already match `vercel.json`, so you can accept them:
   - Install: `bun install`
   - Build: `bun run build`
   - Output directory: `.vercel/output`
3. Deploy.

## Option B — any other host (VPS, Docker, a node host)

```bash
bun install
bun run build:node      # writes .output/
bun run start:node      # or: node .output/server/index.mjs
```

The server listens on port 3000 by default; set `PORT` to change it:

```bash
PORT=8080 node .output/server/index.mjs
```

Put a reverse proxy (nginx, Caddy) in front of it for HTTPS. Everything the app
needs is inside `.output/` — copy that folder and nothing else.

## Environment variables

**None are required for the app itself.** The database address and its public
key are already in the code (`src/integrations/supabase/custom-client.ts`), and
a public key is safe to ship in a frontend.

One variable is needed **only** if you use the **Users** page
(creating accounts, changing roles, deleting accounts):

| Name | Needed for |
| :--- | :--- |
| `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` | Users page only |

This is your database's secret (service-role) key. It must live on the server —
never in the frontend, never in the repository. Set it in your host's
environment settings and redeploy.

Without it, every page still works; the Users page shows a message telling you
the key is missing instead of failing silently.

## Checking a deployment

```bash
curl -I https://your-site/            # 200
curl -I https://your-site/products    # 200
curl -I https://your-site/favicon.svg # 200
```

Every page should answer `200`. A `404` on a page means the route is missing
from the build, not that the app is broken.

## Notes

- `.env` in this repository holds only public keys. It is safe to leave
  committed, but it is not what the app reads for its data — the address is
  hardcoded in `src/integrations/supabase/custom-client.ts`.
- Sign-in, roles, approval requests, inventory, stock movements, receivables,
  payables and bank accounts all run through your Supabase project directly.
- If you move the database to a different project, change the address and the
  public key in `src/integrations/supabase/custom-client.ts` and rebuild.
