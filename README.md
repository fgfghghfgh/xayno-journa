# XAYNO Journal Web

The production web journal is served by Cloudflare Workers and stores shared journal data in Cloudflare D1. Each browser also keeps a local copy for offline access.

## Run locally

```bash
cd C:\Users\rasol\Desktop\XAYNO-built\journal-web\xayno-journal
npm install
npm start
```

Then open:

- http://localhost:3000

This starts the legacy Express development server. The production website uses the Cloudflare Worker described below.

## Production cloud storage

The live website and API are served by [Cloudflare Worker](https://xayno-journal-api.seyed-rasool2017.workers.dev). Its Worker code is [cloudflare/worker.js](cloudflare/worker.js), with the D1 schema in [cloudflare/migrations/0001_init.sql](cloudflare/migrations/0001_init.sql).

The website syncs new trades (including embedded images and saved chart candles/drawings), coaching sessions, daily check-ins, personal rules, lesson notes, and the approved trading profile to D1. Existing browser-only trades are preserved locally and explicitly excluded from automatic upload; the sync indicator reports their count. The browser keeps an offline copy and retries cloud synchronization when it reconnects. Deletes for coach records are synchronized as tombstones so an offline browser does not restore deleted notes.

The Worker uses the server-only `JOURNAL_ACCESS_KEY` to protect journal APIs and `GEMINI_API_KEY` for AI. The browser never receives the Gemini key. The deployed `/api/health` and `/api/config` endpoints report service and AI configuration. The D1 database does not need R2 for these journal records.

Existing Render/Supabase data is separate and has not been imported or deleted. The Cloudflare journal currently starts without old trades, as requested. Do not run `scripts/migrate-render-to-cloudflare.js` unless you later decide to import those trades. The old [server.js](server.js) and [supabase.sql](supabase.sql) are for the legacy Express/Render setup, not the live Cloudflare site.

Fetching new chart candles is disabled until a server-only `BIRDEYE_API_KEY` is configured; previously saved chart data still syncs with its trade. Push notifications are not configured on the Worker.

## Updating the deployment

The existing Worker and D1 database are already configured in [wrangler.toml](wrangler.toml). After changing the web app, validate and deploy from this directory with:

```powershell
node --check public\app.js
npx wrangler deploy
```

Do not create a replacement D1 database or run the old Supabase SQL for the production Worker.
