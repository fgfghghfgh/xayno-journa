# XAYNO Journal Web

The web and desktop real-trade journals use the same trade fields and can sync through a private Render API backed by Supabase. Each device also retains its own local copy for offline use.

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
3. Keep `SUPABASE_SERVICE_ROLE_KEY` only in Render. Never put it in the website, desktop app, GitHub, or a chat message.
4. Use the same private `JOURNAL_ACCESS_KEY` in the website prompt and desktop app prompt. It protects your journal API; do not share it.
5. Redeploy the Render service after saving environment variables.
6. Publish the desktop app update built from `extracted-app/xay.html`; the desktop client syncs every 20 seconds and after local saves.

Generate a private journal key locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Without all three Render environment variables, production API writes are rejected rather than being presented as durable cloud sync. Render's free service filesystem is not a shared persistent database.
