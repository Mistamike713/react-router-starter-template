CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_order_id ON stripe_events(order_id);
