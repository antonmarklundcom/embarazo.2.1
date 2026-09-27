CREATE TABLE `funnelStats` (
	`metric` varchar(16) NOT NULL,
	`key` varchar(48) NOT NULL,
	`day` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	CONSTRAINT `funnelStats_metric_key_day_pk` PRIMARY KEY(`metric`,`key`,`day`)
);
