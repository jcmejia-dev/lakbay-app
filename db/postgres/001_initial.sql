-- Idempotent and additive. Existing records are never deleted or rewritten.
CREATE TABLE IF NOT EXISTS records (
  owner text NOT NULL,
  id text NOT NULL,
  kind text NOT NULL,
  data text NOT NULL,
  updated text NOT NULL,
  PRIMARY KEY (owner,id)
);
CREATE TABLE IF NOT EXISTS service_cache (
  key text PRIMARY KEY,
  data text NOT NULL,
  expires text NOT NULL
);
CREATE TABLE IF NOT EXISTS service_gate (
  name text PRIMARY KEY,
  next_at text NOT NULL,
  day text NOT NULL,
  calls text NOT NULL
);
CREATE TABLE IF NOT EXISTS avatars (
  key text PRIMARY KEY,
  body bytea NOT NULL
);
