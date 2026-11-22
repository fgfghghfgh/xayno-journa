CREATE TABLE IF NOT EXISTS journal_trades (
  id TEXT PRIMARY KEY,
  updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);

CREATE INDEX IF NOT EXISTS journal_trades_updated_at_idx
  ON journal_trades (updated_at DESC);

CREATE TABLE IF NOT EXISTS coach_records (
  collection TEXT NOT NULL CHECK (collection IN (
    'checkins',
    'personal_rules',
    'assignments',
    'contracts',
    'lesson_library',
    'memories',
    'monthly_summaries',
    'chat_history',
    'coaching_sessions'
  )),
  id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS coach_records_updated_at_idx
  ON coach_records (collection, updated_at DESC);
