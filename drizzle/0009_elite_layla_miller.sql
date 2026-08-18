CREATE TABLE `photoBlobs` (
	`userId` varchar(255) NOT NULL,
	`store` varchar(32) NOT NULL,
	`recordId` varchar(64) NOT NULL,
	`objectKey` varchar(512) NOT NULL,
	`contentType` varchar(64) NOT NULL,
	`bytes` int NOT NULL,
	`payload` json,
	`updatedAt` bigint NOT NULL,
	`deletedAt` bigint,
	`serverUpdatedAt` bigint NOT NULL,
	CONSTRAINT `photoBlobs_userId_store_recordId_pk` PRIMARY KEY(`userId`,`store`,`recordId`)
);
--> statement-breakpoint
CREATE INDEX `photoBlobs_user_idx` ON `photoBlobs` (`userId`,`serverUpdatedAt`);