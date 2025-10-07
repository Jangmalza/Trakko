-- CreateTable
CREATE TABLE `PerformanceGoal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `targetYear` INTEGER NOT NULL,
    `targetMonth` INTEGER NOT NULL,
    `targetAmount` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PerformanceGoal_userId_targetYear_targetMonth_key`(`userId`, `targetYear`, `targetMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PerformanceGoal` ADD CONSTRAINT `PerformanceGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
