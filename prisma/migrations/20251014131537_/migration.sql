-- AlterTable (conditional to avoid missing tables during shadow database setup)
SET @drop_comment_updated_at := (
  SELECT IF (
    EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'CommunityComment'
    ),
    'ALTER TABLE `CommunityComment` ALTER COLUMN `updatedAt` DROP DEFAULT',
    'SELECT 1'
  )
);

PREPARE stmt FROM @drop_comment_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_post_updated_at := (
  SELECT IF (
    EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'CommunityPost'
    ),
    'ALTER TABLE `CommunityPost` ALTER COLUMN `updatedAt` DROP DEFAULT',
    'SELECT 1'
  )
);

PREPARE stmt FROM @drop_post_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
