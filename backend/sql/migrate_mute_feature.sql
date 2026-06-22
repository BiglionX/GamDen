-- GamDen 禁言功能数据库迁移
-- 添加 muted_until 字段到 users 表
-- 执行方式: psql -U <user> -d gamden -f migrate_mute_feature.sql

-- 添加禁言到期时间字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP DEFAULT NULL COMMENT '禁言到期时间（NULL表示未禁言）';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_muted_until ON users(muted_until) WHERE muted_until IS NOT NULL;

-- 完成提示
SELECT 'GamDen 禁言功能迁移完成！' AS message;
