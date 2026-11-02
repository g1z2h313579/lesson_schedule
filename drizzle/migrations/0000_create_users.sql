CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`line_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`picture_url` text,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_lineUserId_unique` ON `users` (`line_user_id`);