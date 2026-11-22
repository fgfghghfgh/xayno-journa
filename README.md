# XAYNO Telegram Mini App

The XAYNO trading journal is designed to open inside Telegram as a Mini App. Cloudflare Workers hosts the HTTPS app and API; Cloudflare D1 stores each Telegram user's trades and coaching records in a separate namespace.

## Production setup

The app URL is:

`https://xayno-journal-api.seyed-rasool2017.workers.dev`

1. Create or choose your bot in [@BotFather](https://t.me/BotFather).
2. In BotFather, use `/setdomain` and register `xayno-journal-api.seyed-rasool2017.workers.dev` for the bot.
3. Configure the bot's menu button with `/setmenubutton`; choose a title such as `ژورنال` and use the app URL above.
4. From this project directory, set the bot token as a Cloudflare secret. Enter it only into Wrangler's hidden prompt; do not paste it into source code or chat:

   ```powershell
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```

5. Redeploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

Open the bot in Telegram and tap its menu button. The app rejects access outside Telegram, verifies the signed and time-limited `initData` on the Worker, and scopes D1 and browser-local records by the verified Telegram user ID. Gemini credentials remain server-only.

The `https://` URL is still required to host a Telegram Mini App; opening it directly in a regular browser will show the Telegram-only screen rather than the journal.

The Worker uses Gemini's Interactions API with `gemini-3.5-flash-lite` for chat, coaching, and reports. Temporary overload or availability errors retry once with `gemini-3.1-flash-lite`; invalid credentials and exhausted quota are reported instead of silently retried. The API key remains a Cloudflare secret; model IDs are configured in `wrangler.toml`.

## Data safety

The Mini App does not import historical Render, Supabase, or desktop data. Existing D1 rows are not deleted. New trades (including saved chart candles, drawings, and embedded images) and coaching data are stored under the authenticated Telegram user. A user's old browser-only local data is not automatically uploaded.

## Local checks and deployment

```powershell
npm run test:telegram
node --check public\app.js
npx wrangler deploy --dry-run
npx wrangler deploy
```

The Telegram signature tests use a fake test token only; it is not a real bot credential.
