CREATE TABLE `companionSnapshots` (
	`pregnancyId` varchar(64) NOT NULL,
	`week` int,
	`dueDate` bigint,
	`nextAppointmentAt` bigint,
	`babyName` varchar(64),
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `companionSnapshots_pregnancyId` PRIMARY KEY(`pregnancyId`)
);
