-- AlterTable
ALTER TABLE `Trade`
  ADD COLUMN `entryRationale` TEXT NULL,
  ADD COLUMN `exitRationale` TEXT NULL,
  MODIFY `rationale` TEXT NULL;
