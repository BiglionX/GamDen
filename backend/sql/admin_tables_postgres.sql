-- GamDen后台管理系统数据库表（PostgreSQL版本）
-- 创建时间: 2026-06-22
-- 说明: 补充后台管理系统所需的配置表和日志表

-- ============================================
-- 1. 野兽潮配置表（beast_config）
-- ============================================
CREATE TABLE IF NOT EXISTS beast_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  check_interval INTEGER DEFAULT 1 CHECK (check_interval >= 1 AND check_interval <= 24),
  trigger_probability INTEGER DEFAULT 20 CHECK (trigger_probability >= 0 AND trigger_probability <= 100),
  min_level INTEGER DEFAULT 1 CHECK (min_level >= 1 AND min_level <= 5),
  max_level INTEGER DEFAULT 3 CHECK (max_level >= 1 AND max_level <= 5),
  affect_range INTEGER DEFAULT 20 CHECK (affect_range >= 10 AND affect_range <= 50),
  defense_fail_probability INTEGER DEFAULT 30 CHECK (defense_fail_probability >= 0 AND defense_fail_probability <= 100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT
);

COMMENT ON TABLE beast_config IS '野兽潮配置表';
COMMENT ON COLUMN beast_config.check_interval IS '刷新时间间隔（小时）';
COMMENT ON COLUMN beast_config.trigger_probability IS '触发概率（%）';
COMMENT ON COLUMN beast_config.min_level IS '最小强度（1~5）';
COMMENT ON COLUMN beast_config.max_level IS '最大强度（1~5）';
COMMENT ON COLUMN beast_config.affect_range IS '影响范围（格）';
COMMENT ON COLUMN beast_config.defense_fail_probability IS '防御失败概率（%）';

-- 插入默认配置
INSERT INTO beast_config (id, check_interval, trigger_probability, min_level, max_level, affect_range, defense_fail_probability, updated_by)
VALUES (1, 1, 20, 1, 3, 20, 30, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 金币规则配置表（gold_config）
-- ============================================
CREATE TABLE IF NOT EXISTS gold_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value INTEGER NOT NULL CHECK (config_value >= 0),
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT
);

COMMENT ON TABLE gold_config IS '金币规则配置表';
COMMENT ON COLUMN gold_config.config_key IS '配置项key';
COMMENT ON COLUMN gold_config.config_value IS '配置项value';

-- 插入默认配置
INSERT INTO gold_config (config_key, config_value, description) VALUES
  ('register_reward', 100, '注册奖励（金币）'),
  ('sign_in_reward', 10, '每日签到奖励（金币）'),
  ('continuous_sign_in_bonus', 5, '连续签到额外奖励（金币/天）'),
  ('post_reward', 5, '发帖奖励（金币）'),
  ('reply_reward', 2, '回帖奖励（金币）'),
  ('invite_reward', 50, '邀请好友奖励（金币）'),
  ('defend_beast_min_reward', 50, '防御野兽潮最低奖励（金币）'),
  ('defend_beast_max_reward', 200, '防御野兽潮最高奖励（金币）')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- 3. 操作日志表（operation_logs）
-- ============================================
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  operator_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target TEXT,
  reason VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE operation_logs IS '操作日志表';
COMMENT ON COLUMN operation_logs.operator_id IS '操作人ID';
COMMENT ON COLUMN operation_logs.action IS '操作类型';
COMMENT ON COLUMN operation_logs.target IS '操作目标';

CREATE INDEX IF NOT EXISTS idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);

-- ============================================
-- 4. 敏感词库表（sensitive_words）
-- ============================================
CREATE TABLE IF NOT EXISTS sensitive_words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('political', 'porn', 'violence', 'insult', 'ad')),
  level VARCHAR(10) NOT NULL CHECK (level IN ('high', 'medium', 'low')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sensitive_words IS '敏感词库表';
COMMENT ON COLUMN sensitive_words.word IS '敏感词';
COMMENT ON COLUMN sensitive_words.category IS '分类';
COMMENT ON COLUMN sensitive_words.level IS '级别（high/medium/low）';

CREATE INDEX IF NOT EXISTS idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX IF NOT EXISTS idx_sensitive_words_level ON sensitive_words(level);

-- 插入一些示例敏感词
INSERT INTO sensitive_words (word, category, level) VALUES
  ('示例敏感词1', 'insult', 'high'),
  ('示例敏感词2', 'ad', 'medium')
ON CONFLICT (word) DO NOTHING;

-- ============================================
-- 5. 用户违规记录表（user_violations）
-- ============================================
CREATE TABLE IF NOT EXISTS user_violations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  violation_type VARCHAR(20) NOT NULL CHECK (violation_type IN ('signature', 'post', 'reply')),
  violation_count INTEGER DEFAULT 1,
  last_violation_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_violations IS '用户违规记录表';

ALTER TABLE user_violations ADD CONSTRAINT fk_user_violations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);

-- ============================================
-- 6. 申诉工单表（appeals）
-- ============================================
CREATE TABLE IF NOT EXISTS appeals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  appeal_type VARCHAR(20) NOT NULL CHECK (appeal_type IN ('freeze', 'ban', 'content_reject')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id BIGINT,
  review_comment TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE appeals IS '申诉工单表';

ALTER TABLE appeals ADD CONSTRAINT fk_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);

-- ============================================
-- 自动更新 updated_at 的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_beast_config_updated_at BEFORE UPDATE ON beast_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gold_config_updated_at BEFORE UPDATE ON gold_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensitive_words_updated_at BEFORE UPDATE ON sensitive_words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appeals_updated_at BEFORE UPDATE ON appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'GamDen后台管理系统数据库表创建完成！';
END $$;
