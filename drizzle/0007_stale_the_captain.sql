ALTER TABLE `companionSnapshots` ADD `sharePeso` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `sharePataditas` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `shareFotos` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `weightGrams` int;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `weightAt` bigint;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `kickCount` int;--> statement-breakpoint
ALTER TABLE `companionSnapshots` ADD `kickAt` bigint;