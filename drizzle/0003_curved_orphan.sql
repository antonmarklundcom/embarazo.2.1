CREATE TABLE `pushReminders` (
	`id` varchar(64) NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`category` enum('consejos','recordatorios','avisos') NOT NULL,
	`fireAt` bigint NOT NULL,
	`sentAt` bigint,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `pushReminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pushSubscriptions` MODIFY COLUMN `userId` varchar(255);--> statement-breakpoint
CREATE INDEX `push_reminders_due_idx` ON `pushReminders` (`fireAt`,`sentAt`);--> statement-breakpoint
CREATE INDEX `push_reminders_endpoint_idx` ON `pushReminders` (`endpoint`);