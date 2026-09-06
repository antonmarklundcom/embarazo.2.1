CREATE TABLE `appFlags` (
	`key` varchar(64) NOT NULL,
	`value` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp(3) NOT NULL DEFAULT (now()),
	`updatedBy` varchar(255),
	CONSTRAINT `appFlags_key` PRIMARY KEY(`key`)
);
