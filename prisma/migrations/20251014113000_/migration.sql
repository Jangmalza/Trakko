-- AlterTable (conditional to avoid failures before CommunityPost creation)
SET @alter_stmt := (
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

PREPARE stmt FROM @alter_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
