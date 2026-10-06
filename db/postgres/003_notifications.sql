-- Additive and safe to run repeatedly. Existing records, sessions and XP remain untouched.
CREATE TABLE IF NOT EXISTS notifications (
  owner text NOT NULL, id text NOT NULL, data text NOT NULL, sent_at bigint NOT NULL,
  created_at bigint NOT NULL, push boolean NOT NULL DEFAULT false, PRIMARY KEY(owner,id)
);
CREATE INDEX IF NOT EXISTS notifications_owner_time ON notifications(owner,sent_at DESC);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id text PRIMARY KEY, owner text NOT NULL, endpoint text NOT NULL,
  p256dh text NOT NULL, auth text NOT NULL, created_at bigint NOT NULL, updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subscriptions_owner ON push_subscriptions(owner);
CREATE TABLE IF NOT EXISTS push_deliveries (
  subscription_id text NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  owner text NOT NULL, notification_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0, next_at bigint NOT NULL DEFAULT 0,
  delivered_at bigint, PRIMARY KEY(subscription_id,notification_id),
  FOREIGN KEY(owner,notification_id) REFERENCES notifications(owner,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS push_deliveries_pending ON push_deliveries(next_at) WHERE delivered_at IS NULL;
