-- AlterTable: add period column and update default for targetMonth
ALTER TABLE `PerformanceGoal`
  ADD COLUMN `period` ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
  MODIFY `targetMonth` INTEGER NOT NULL DEFAULT 0;

-- Ensure existing rows have the new period default
UPDATE `PerformanceGoal` SET `period` = 'MONTHLY' WHERE `period` IS NULL;

-- Create the new unique index (while the old one still exists to satisfy FK requirements)
CREATE UNIQUE INDEX `PerformanceGoal_userId_period_targetYear_targetMonth_key`
  ON `PerformanceGoal`(`userId`, `period`, `targetYear`, `targetMonth`);

-- Drop the previous unique index
DROP INDEX `PerformanceGoal_userId_targetYear_targetMonth_key` ON `PerformanceGoal`;
