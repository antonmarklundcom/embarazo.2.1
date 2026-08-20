-- K14 (docs/FABLE-PLAN-2026-08.md §6): `pregnancies_owner_idx` becomes UNIQUE.
--
-- `ensurePregnancyForOwner` reads-then-inserts, so two concurrent requests for
-- the same owner could both create a pregnancy. The database is the only place
-- that race can be settled. `lib/server/sharing.ts` now catches the duplicate
-- key and re-reads, so the loser returns the winner's id.
--
-- NOTE for any deployment that already has data: if an owner somehow has two
-- rows, this ALTER fails rather than silently deleting one. That is the right
-- failure — merging two pregnancies is a decision, not a migration. Check with
--   SELECT ownerUserId, COUNT(*) FROM pregnancies GROUP BY ownerUserId HAVING COUNT(*) > 1;
-- before running it. (Pre-launch, this returns nothing.)

DROP INDEX `pregnancies_owner_idx` ON `pregnancies`;--> statement-breakpoint
ALTER TABLE `pregnancies` ADD CONSTRAINT `pregnancies_owner_idx` UNIQUE(`ownerUserId`);