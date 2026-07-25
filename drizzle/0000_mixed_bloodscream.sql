CREATE TABLE `accounts` (
	`userId` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`providerAccountId` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`session_state` varchar(255),
	CONSTRAINT `accounts_provider_providerAccountId_pk` PRIMARY KEY(`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `adminAudit` (
	`id` varchar(64) NOT NULL,
	`actorUserId` varchar(255) NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetUserId` varchar(255),
	`meta` json,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAudit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiGenerations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`quotaMonth` varchar(7) NOT NULL,
	`model` varchar(128) NOT NULL,
	`status` enum('pending','succeeded','failed') NOT NULL,
	`costUsdMicros` int,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `aiGenerations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentStats` (
	`week` int NOT NULL,
	`contentId` varchar(128) NOT NULL,
	`day` varchar(10) NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	CONSTRAINT `contentStats_week_contentId_day_pk` PRIMARY KEY(`week`,`contentId`,`day`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`code` varchar(32) NOT NULL,
	`pregnancyId` varchar(64) NOT NULL,
	`role` enum('owner','partner','family') NOT NULL,
	`createdByUserId` varchar(255) NOT NULL,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`expiresAt` timestamp(3) NOT NULL,
	`acceptedByUserId` varchar(255),
	`acceptedAt` timestamp(3),
	`revokedAt` timestamp(3),
	CONSTRAINT `invites_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `pregnancies` (
	`id` varchar(64) NOT NULL,
	`ownerUserId` varchar(255) NOT NULL,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`updatedAt` bigint NOT NULL,
	`deletedAt` bigint,
	CONSTRAINT `pregnancies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pregnancyMembers` (
	`id` varchar(64) NOT NULL,
	`pregnancyId` varchar(64) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`role` enum('owner','partner','family') NOT NULL,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`revokedAt` timestamp(3),
	CONSTRAINT `pregnancyMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `pregnancy_members_unique` UNIQUE(`pregnancyId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `pushSubscriptions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`categories` json NOT NULL,
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp(3),
	CONSTRAINT `pushSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`sessionToken` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`expires` timestamp(3) NOT NULL,
	CONSTRAINT `sessions_sessionToken` PRIMARY KEY(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `syncRecords` (
	`userId` varchar(255) NOT NULL,
	`store` enum('profile','symptomEntries','kickSessions','contractions','weights','appointments','checklistItems','cycles','cycleSettings','clinical','journal') NOT NULL,
	`recordId` varchar(128) NOT NULL,
	`pregnancyId` varchar(64),
	`updatedAt` bigint NOT NULL,
	`deletedAt` bigint,
	`payload` json,
	CONSTRAINT `syncRecords_userId_store_recordId_pk` PRIMARY KEY(`userId`,`store`,`recordId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255) NOT NULL,
	`emailVerified` timestamp(3),
	`image` varchar(512),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`deletedAt` timestamp(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verificationTokens` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp(3) NOT NULL,
	CONSTRAINT `verificationTokens_identifier_token_pk` PRIMARY KEY(`identifier`,`token`)
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `admin_audit_actor_idx` ON `adminAudit` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `admin_audit_target_idx` ON `adminAudit` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `ai_generations_quota_idx` ON `aiGenerations` (`userId`,`quotaMonth`);--> statement-breakpoint
CREATE INDEX `ai_generations_spend_idx` ON `aiGenerations` (`quotaMonth`);--> statement-breakpoint
CREATE INDEX `invites_pregnancy_idx` ON `invites` (`pregnancyId`);--> statement-breakpoint
CREATE INDEX `pregnancies_owner_idx` ON `pregnancies` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `pregnancy_members_user_idx` ON `pregnancyMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `pushSubscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `sync_records_since_idx` ON `syncRecords` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `sync_records_pregnancy_idx` ON `syncRecords` (`pregnancyId`);