CREATE TABLE IF NOT EXISTS coach_followups (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  last_checked_at TEXT,
  last_sent_at TEXT,
  last_message TEXT
);

CREATE INDEX IF NOT EXISTS coach_followups_enabled_idx
  ON coach_followups (enabled, last_checked_at);
