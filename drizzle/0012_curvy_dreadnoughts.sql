CREATE TABLE `communityQuestions` (
	`id` varchar(64) NOT NULL,
	`askedByUserId` varchar(255) NOT NULL,
	`question` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`answer` text,
	`answeredByUserId` varchar(255),
	`createdAt` timestamp(3) NOT NULL DEFAULT (now()),
	`decidedAt` timestamp(3),
	CONSTRAINT `communityQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `community_questions_status_idx` ON `communityQuestions` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_questions_asked_by_idx` ON `communityQuestions` (`askedByUserId`);