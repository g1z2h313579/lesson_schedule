CREATE TABLE `credit_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacher_student_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reject_reason` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`teacher_student_id`) REFERENCES `teacher_students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `credit_requests_teacher_student_idx` ON `credit_requests` (`teacher_student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_requests_one_pending_unique` ON `credit_requests` (`teacher_student_id`) WHERE status = 'pending';--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`inviter_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_by_id` integer,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_code_unique` ON `invitations` (`code`);--> statement-breakpoint
CREATE INDEX `invitations_inviter_idx` ON `invitations` (`inviter_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacher_student_id` integer NOT NULL,
	`weekly_schedule_id` integer,
	`starts_at` integer NOT NULL,
	`duration_minutes` integer DEFAULT 50 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`cancelled_at` integer,
	`cancelled_by_id` integer,
	`cancel_reason` text,
	`rescheduled_to_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`teacher_student_id`) REFERENCES `teacher_students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`weekly_schedule_id`) REFERENCES `weekly_schedules`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cancelled_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rescheduled_to_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lessons_teacher_student_starts_at_idx` ON `lessons` (`teacher_student_id`,`starts_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_scheduled_slot_unique` ON `lessons` (`teacher_student_id`,`starts_at`) WHERE status = 'scheduled';--> statement-breakpoint
CREATE INDEX `lessons_starts_at_idx` ON `lessons` (`starts_at`);--> statement-breakpoint
CREATE TABLE `message_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_images_r2Key_unique` ON `message_images` (`r2_key`);--> statement-breakpoint
CREATE INDEX `message_images_message_idx` ON `message_images` (`message_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_id` integer NOT NULL,
	`sender_id` integer NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`body` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_lesson_created_at_idx` ON `messages` (`lesson_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `teacher_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacher_id` integer NOT NULL,
	`student_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_students_pair_unique` ON `teacher_students` (`teacher_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `teacher_students_student_idx` ON `teacher_students` (`student_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`line_user_id` text NOT NULL,
	`line_display_name` text NOT NULL,
	`picture_url` text,
	`name` text,
	`introduction` text,
	`role` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_lineUserId_unique` ON `users` (`line_user_id`);--> statement-breakpoint
CREATE TABLE `weekly_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacher_student_id` integer NOT NULL,
	`weekday` integer NOT NULL,
	`start_hour` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`teacher_student_id`) REFERENCES `teacher_students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_schedules_slot_unique` ON `weekly_schedules` (`teacher_student_id`,`weekday`,`start_hour`);