-- CreateTable
CREATE TABLE `CommunityComment` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityComment_postId_idx`(`postId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `CommunityComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `CommunityComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
