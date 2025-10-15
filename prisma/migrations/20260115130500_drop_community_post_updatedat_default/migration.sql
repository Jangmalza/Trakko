-- Ensure CommunityPost.updatedAt has no default even when table was created with CURRENT_TIMESTAMP
SET @drop_post_default_stmt := (
  SELECT IF (
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'CommunityPost'
        AND column_name = 'updatedAt'
        AND column_default IS NOT NULL
    ),
    'ALTER TABLE `CommunityPost` ALTER COLUMN `updatedAt` DROP DEFAULT',
    'SELECT 1'
  )
);

PREPARE stmt FROM @drop_post_default_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure CommunityComment.updatedAt has no default either
SET @drop_comment_default_stmt := (
  SELECT IF (
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'CommunityComment'
        AND column_name = 'updatedAt'
        AND column_default IS NOT NULL
    ),
    'ALTER TABLE `CommunityComment` ALTER COLUMN `updatedAt` DROP DEFAULT',
    'SELECT 1'
  )
);

PREPARE stmt FROM @drop_comment_default_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
