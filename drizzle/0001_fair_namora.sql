CREATE TABLE `service_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_gate` (
	`name` text PRIMARY KEY NOT NULL,
	`next_at` text NOT NULL,
	`day` text NOT NULL,
	`calls` text NOT NULL
);
