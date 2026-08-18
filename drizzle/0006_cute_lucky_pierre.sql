CREATE TABLE `companionCheers` (
	`id` varchar(64) NOT NULL,
	`pregnancyId` varchar(64) NOT NULL,
	`fromUserId` varchar(255) NOT NULL,
	`cheerId` varchar(32) NOT NULL,
	`createdAt` bigint NOT NULL,
	`seenAt` bigint,
	CONSTRAINT `companionCheers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companionTasks` (
	`id` varchar(64) NOT NULL,
	`pregnancyId` varchar(64) NOT NULL,
	`itemKey` varchar(64) NOT NULL,
	`doneAt` bigint,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `companionTasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `companionTasks_pregnancy_item` UNIQUE(`pregnancyId`,`itemKey`)
);
--> statement-breakpoint
CREATE INDEX `companionCheers_pregnancy` ON `companionCheers` (`pregnancyId`);