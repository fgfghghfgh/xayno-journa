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
3. Add `BIRDEYE_API_KEY` to Render as a server-only secret so the mobile journal can request bounded 5m/15m candles. Never put this key in browser code.
4. To enable iPhone notifications, run `npx web-push generate-vapid-keys` locally and add `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` to Render. Keep the private key server-only.
5. In the Supabase SQL Editor, run the `journal_push_subscriptions` table section from [supabase.sql](supabase.sql), then redeploy Render.
6. On iPhone, open the journal in Safari, use **Share → Add to Home Screen**, launch the installed XAYNO Journal app, and tap **فعال‌سازی اعلان**. Allow notifications when iOS asks.
7. Keep `SUPABASE_SERVICE_ROLE_KEY` only in Render. Never put it in the website, desktop app, GitHub, or a chat message.
8. Use the same private `JOURNAL_ACCESS_KEY` in the website and desktop app. It protects your journal API; do not share it.
9. Redeploy the Render service after saving environment variables.
10. Publish the desktop app update built from `extracted-app/xay.html`; the desktop client syncs every 20 seconds and after local saves.

Generate a private journal key locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Without all three Render environment variables, production API writes are rejected rather than being presented as durable cloud sync. Render's free service filesystem is not a shared persistent database.
