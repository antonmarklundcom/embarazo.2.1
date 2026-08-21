CREATE TABLE `placementClicks` (
	`placementId` varchar(128) NOT NULL,
	`day` varchar(10) NOT NULL,
	`clicks` int NOT NULL DEFAULT 0,
	CONSTRAINT `placementClicks_placementId_day_pk` PRIMARY KEY(`placementId`,`day`)
);
