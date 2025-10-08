-- AlterTable
ALTER TABLE `User` ADD COLUMN `subscriptionTier` ENUM('FREE', 'PRO') NOT NULL DEFAULT 'FREE';
