DROP INDEX `sync_records_since_idx` ON `syncRecords`;--> statement-breakpoint
ALTER TABLE `syncRecords` MODIFY COLUMN `store` enum('profile','pregnancy','journalEntries','kickSessions','contractionEntries','weightEntries','checklistState','cycles','cycleSettings','clinical') NOT NULL;--> statement-breakpoint
ALTER TABLE `syncRecords` ADD `serverUpdatedAt` bigint NOT NULL;--> statement-breakpoint
CREATE INDEX `sync_records_since_idx` ON `syncRecords` (`userId`,`serverUpdatedAt`);