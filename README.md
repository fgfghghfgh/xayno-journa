# XAYNO Journal Web

This is a minimal local-first journal web app for your trading journal.

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
- JSON API at /api/trades

## Deploy to the web

### Option 1: Cloudflare Pages

1. Push this folder to GitHub.
2. Open Cloudflare Pages.
3. Import the repo.
4. Set build command to empty / none.
5. For static hosting, you can keep this repo as a simple static site, or move the frontend to a static directory and keep API on a server.

### Option 2: Vercel / Netlify

1. Push to GitHub.
2. Connect to Vercel or Netlify.
3. Deploy with Node app mode for the server.

### Option 3: Supabase + frontend

- Use Supabase as the online database.
- Keep the desktop app local-first.
- Sync to the remote database when online.

## Next upgrade for your exact goal

To make this work from your iPhone online while still saving to local desktop storage, the next step is:

- add Supabase
- create a trades table
- sync local desktop writes to remote DB
- read the same remote DB in the website

That gives you: local + online at the same time.
