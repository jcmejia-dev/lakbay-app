-- Additive, idempotent event ledger. Uses the existing authenticated owner.
-- The state itself remains a record, not a second user/profile system.
CREATE TABLE IF NOT EXISTS progression_events (
  owner text NOT NULL,
  event_key text NOT NULL,
  xp integer NOT NULL CHECK (xp >= 0),
  data text NOT NULL,
  created_at text NOT NULL,
  notified boolean NOT NULL DEFAULT true,
  PRIMARY KEY (owner,event_key)
);
CREATE INDEX IF NOT EXISTS progression_pending ON progression_events(owner,created_at) WHERE notified=false;
