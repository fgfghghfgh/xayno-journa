CREATE TABLE IF NOT EXISTS crypto_market_assets (
  symbol TEXT PRIMARY KEY,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL DEFAULT 'USDT',
  name TEXT NOT NULL DEFAULT '',
  is_saved INTEGER NOT NULL DEFAULT 1 CHECK (is_saved IN (0, 1)),
  saved_at TEXT NOT NULL,
  sync_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(sync_json)),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS crypto_market_assets_saved_at_idx
  ON crypto_market_assets (is_saved, saved_at DESC);

CREATE TABLE IF NOT EXISTS crypto_candle_chunks (
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('5m', '15m', '1h', '4h', '12h', '1d')),
  month_key INTEGER NOT NULL,
  candles_json TEXT NOT NULL CHECK (json_valid(candles_json)),
  oldest_open_time INTEGER,
  newest_open_time INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (symbol, interval, month_key)
);

CREATE INDEX IF NOT EXISTS crypto_candle_chunks_range_idx
  ON crypto_candle_chunks (symbol, interval, month_key DESC);
