# XAYNO Journal Web

The web and desktop real-trade journals use the same trade fields and can sync through a private API. Each device also retains its own local copy for offline use.

## Run locally

```bash
cd C:\Users\rasol\Desktop\XAYNO-built\journal-web
npm install
npm start
```

Then open:

- http://localhost:3000

## What it does

- calendar-based journal
- daily trade entries
- win/loss summary
- local storage persistence
- full desktop journal fields, including entry/exit details and images
- authenticated JSON API at /api/trades
- conflict-aware two-way sync with deletion tombstones

## Secure two-way sync setup

1. Run the SQL in [supabase.sql](supabase.sql) in the Supabase SQL Editor. The table has row-level security enabled and grants no direct table access to browser users.
2. In Render, open the service's **Environment** page and add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JOURNAL_ACCESS_KEY`.
3. Add `BIRDEYE_API_KEY` to Render as a server-only secret so the mobile journal can request bounded 5m/15m candles. Never put this key in browser code.
4. To enable iPhone notifications, run `npx web-push generate-vapid-keys` locally and add `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` to Render. Keep the private key server-only.
5. In the Supabase SQL Editor, run the `journal_push_subscriptions` table section from [supabase.sql](supabase.sql), then redeploy Render.
6. On iPhone, open the journal in Safari, use **Share → Add to Home Screen**, launch the installed XAYNO Journal app, and tap **فعال‌سازی اعلان**. Allow notifications when iOS asks.
7. Keep `SUPABASE_SERVICE_ROLE_KEY` only in Render. Never put it in the website, desktop app, GitHub, or a chat message.
8. Use the same private `JOURNAL_ACCESS_KEY` in the website and desktop app. It protects your journal API; do not share it.
9. Redeploy the Render service after saving environment variables.
10. Publish the desktop app update built from `extracted-app/xay.html`; the desktop client syncs every 20 seconds and after local saves.

## Central coach database and AI models

1. Run the latest [supabase.sql](supabase.sql) in the Supabase SQL Editor. It adds the central tables for check-ins, rules, assignments, contracts, lesson library, memories, monthly summaries and chat history.
2. Set `GEMINI_API_KEY` on the server for Gemini. `GEMINI_CHAT_MODEL` defaults to `gemini-2.5-flash-lite`; `GEMINI_REPORT_MODEL` defaults to `gemini-2.5-flash`.
3. OpenAI-compatible variables remain supported as fallback. Keep every API key only in the server environment, never in the browser or desktop source.
4. Central coach records use `/api/central/:collection` and require the same private `JOURNAL_ACCESS_KEY`.

### Cloudflare Workers + D1

The Cloudflare Worker backend is in [cloudflare/worker.js](cloudflare/worker.js), and its D1 schema is in [cloudflare/migrations/0001_init.sql](cloudflare/migrations/0001_init.sql). It is deployed at https://xayno-journal-api.seyed-rasool2017.workers.dev. The existing Render/Express backend and its data remain untouched; the Cloudflare D1 database must be populated from the old journal before switching other clients to it.

The deployed Worker serves the web app and its `/api/*` routes. Health and configuration checks are available at `/api/health` and `/api/config`. The Gemini API key and journal access key are server-only Cloudflare secrets. Chat and reports are configured; chart requests remain disabled until `BIRDEYE_API_KEY` is added, and push notifications are not implemented on this Worker.

#### Non-destructive trade migration

Run `node scripts/migrate-render-to-cloudflare.js` from this project directory in an interactive PowerShell or VS Code terminal. Enter the existing Render `JOURNAL_ACCESS_KEY` only when prompted; input is hidden and the script never prints the key or trade contents. It combines Render trades, `data/trades.json` if present, and an optional desktop JSON backup, keeping the newest version of duplicate IDs. After showing source counts, the script asks for `IMPORT`; confirmation also replaces the Cloudflare `JOURNAL_ACCESS_KEY` with the same Render key, so there is no second key to copy. It inserts trades into D1 in small batches, skips matching IDs without overwriting existing Cloudflare records, then verifies the destination count. Render and local source data are never deleted. If the run is interrupted, rerunning it is safe; already imported trade IDs are skipped. This migrates trades only; coach records must be migrated separately before retiring their old storage.

To reproduce or update the Cloudflare deployment:

1. Install Wrangler locally with `npm install --save-dev wrangler`.
2. From this project folder, run `npx wrangler login`, then `npx wrangler d1 create xayno-journal`.
3. Copy the `database_id` from Wrangler's output into `wrangler.toml`.
4. Apply the schema with `npx wrangler d1 migrations apply xayno-journal --remote`.
5. Add server-only secrets with `npx wrangler secret put GEMINI_API_KEY` and `npx wrangler secret put JOURNAL_ACCESS_KEY`.
6. Deploy with `npx wrangler deploy`.

`GEMINI_CHAT_MODEL` and `GEMINI_REPORT_MODEL` are ordinary server-side model settings in `wrangler.toml`; API keys are secrets and must never be added there or to browser code. The Supabase SQL schema is separate and is not used by D1.

Generate a private journal key locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Render's free service filesystem is not a shared persistent database. Keep the existing Render service and database until a verified migration to D1 is complete.
