## Why the Dashboard item is missing on Vercel

In `src/components/app/AppLayout.tsx`, both **Dashboard** and **Users** nav items are gated by `roles: ["admin"]`. The role is loaded by `getMyRole()` (a TanStack server function in `src/lib/auth.functions.ts`) which runs server-side and uses:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used by `supabaseAdmin`)

Plus the browser client uses:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

On Vercel these are not auto-injected (only Lovable Cloud injects them). When `getMyRole()` fails, the catch in `use-auth.tsx` sets `role = null` and clears the cached role — so admin-only links disappear, even though login still works (login uses only the browser client, which may have the VITE_ vars baked in at build).

## Fix — Step 1: Add env vars to Vercel

In Vercel → Project → Settings → Environment Variables, add (for Production + Preview):

```
VITE_SUPABASE_URL              = https://sftddziyozbsmeezscah.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = <anon key from .env>
SUPABASE_URL                   = https://sftddziyozbsmeezscah.supabase.co
SUPABASE_PUBLISHABLE_KEY       = <same anon key>
SUPABASE_SERVICE_ROLE_KEY      = <service role key — get from Lovable Cloud → Backend>
```

Then **Redeploy** (a rebuild is required because `VITE_*` vars are bundled at build time).

## Fix — Step 2: Verify server functions actually run on Vercel

This project ships with `wrangler.jsonc` and is built for **Cloudflare Workers**, not Vercel. TanStack Start needs a Vercel preset to deploy server functions on Vercel. Two options:

- **Recommended:** Deploy on Cloudflare Pages/Workers (matches current config) or just use Lovable's built-in Publish — both already have env vars wired up.
- **Stay on Vercel:** add the Vercel deployment preset to `vite.config.ts` (TanStack Start `target: 'vercel'`) so server functions are emitted as Vercel Functions. Without this, `getMyRole` returns a 404/HTML and the role load silently fails.

## How to verify after deploying

1. Open the deployed site, log in, open DevTools → Network.
2. Look for the `getMyRole` request. Expected: `200` with `{ role: "admin" }`. If you see 404 / HTML / 500, it's the deployment preset (Step 2). If you see 500 with a Supabase error, it's the env vars (Step 1).
3. After a successful response, the Dashboard link appears immediately.

## Notes

- No source code changes are needed — this is purely a deployment configuration issue.
- The role is cached in `localStorage` under `stockhub.role`, so once it loads once successfully on the Vercel domain, it sticks across reloads.
