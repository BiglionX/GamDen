-- GamDen数据库Schema V1.0 (PostgreSQL版本)
-- 创建时间: 2026-06-22
-- 说明: 游戏巢穴社区数据库结构（适配Neon PostgreSQL）
-- 使用方法: 在Neon SQL Editor中全文复制执行

-- ============================================
-- 1. 用户表（users）
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL DEFAULT '',
  avatar VARCHAR(255) DEFAULT '',
  guardian_type VARCHAR(20) NOT NULL CHECK (guardian_type IN ('mechanic', 'elf', 'astrologer')),
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  invited_by BIGINT,
  territory_coord_x INTEGER NOT NULL,
  territory_coord_y INTEGER NOT NULL,
  signature VARCHAR(20) DEFAULT '',
  gold_coins INTEGER DEFAULT 100,
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'vip', 'club_admin', 'operator', 'super_admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'deleted')),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (territory_coord_x, territory_coord_y),
  CHECK (territory_coord_x >= -1000 AND territory_coord_x <= 1000),
  CHECK (territory_coord_y >= -1000 AND territory_coord_y <= 1000)
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.phone IS '手机号';
COMMENT ON COLUMN users.password_hash IS '密码哈希（bcrypt）';
COMMENT ON COLUMN users.nickname IS '用户昵称';
COMMENT ON COLUMN users.guardian_type IS '守护灵类型';
COMMENT ON COLUMN users.level IS '领地等级（1~5）';
COMMENT ON COLUMN users.invite_code IS '个人邀请码（6位字母数字）';

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 2. 邀请记录表（invite_records）
-- ============================================
CREATE TABLE IF NOT EXISTS invite_records (
  id BIGSERIAL PRIMARY KEY,
  inviter_id BIGINT NOT NULL,
  invitee_id BIGINT UNIQUE NOT NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  mini_program_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invite_records ADD CONSTRAINT fk_invite_records_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invite_records ADD CONSTRAINT fk_invite_records_invitee FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE;

COMMENT ON TABLE invite_records IS '邀请记录表';

CREATE INDEX IF NOT EXISTS idx_invite_records_inviter_id ON invite_records(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_records_invitee_id ON invite_records(invitee_id);

-- ============================================
-- 3. 领地演进记录表（territory_evolution）
-- ============================================
CREATE TABLE IF NOT EXISTS territory_evolution (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  icon_url VARCHAR(255) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE territory_evolution ADD CONSTRAINT fk_territory_evolution_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_territory_evolution_user_id ON territory_evolution(user_id);

-- ============================================
-- 4. 俱乐部表（clubs）
-- ============================================
CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  game_name VARCHAR(50) NOT NULL,
  description VARCHAR(500),
  owner_id BIGINT NOT NULL,
  openim_group_id VARCHAR(100) DEFAULT '',
  member_count INTEGER DEFAULT 1,
  post_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE clubs ADD CONSTRAINT fk_clubs_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);
CREATE INDEX IF NOT EXISTS idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_game_name ON clubs(game_name);

-- ============================================
-- 5. 俱乐部帖子表（club_posts）
-- ============================================
CREATE TABLE IF NOT EXISTS club_posts (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content VARCHAR(500) NOT NULL,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE club_posts ADD CONSTRAINT fk_club_posts_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE club_posts ADD CONSTRAINT fk_club_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_club_posts_club_id ON club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_user_id ON club_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_status ON club_posts(status);
CREATE INDEX IF NOT EXISTS idx_club_posts_created_at ON club_posts(created_at DESC);

-- ============================================
-- 6. 帖子回复表（post_replies）
-- ============================================
CREATE TABLE IF NOT EXISTS post_replies (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content VARCHAR(200) NOT NULL,
  like_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE post_replies ADD CONSTRAINT fk_post_replies_post FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE;
ALTER TABLE post_replies ADD CONSTRAINT fk_post_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_user_id ON post_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_created_at ON post_replies(created_at DESC);

-- ============================================
-- 7. Agent对话日志表（agent_dialogues）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_dialogues (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('mechanic', 'elf', 'astrologer')),
  trigger_event VARCHAR(50) NOT NULL,
  response_text TEXT NOT NULL,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE agent_dialogues ADD CONSTRAINT fk_agent_dialogues_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_dialogues_user_id ON agent_dialogues(user_id);

-- ============================================
-- 8. 个人小程序生成记录表（mini_programs）
-- ============================================
CREATE TABLE IF NOT EXISTS mini_programs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  qr_code_url VARCHAR(255) NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE mini_programs ADD CONSTRAINT fk_mini_programs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- 9. 野兽潮事件表（beast_events）
-- ============================================
CREATE TABLE IF NOT EXISTS beast_events (
  id BIGSERIAL PRIMARY KEY,
  event_level INTEGER NOT NULL CHECK (event_level >= 1 AND event_level <= 5),
  coord_x INTEGER NOT NULL,
  coord_y INTEGER NOT NULL,
  affected_users JSON,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CHECK (coord_x >= -1000 AND coord_x <= 1000),
  CHECK (coord_y >= -1000 AND coord_y <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_beast_events_coord ON beast_events(coord_x, coord_y);
CREATE INDEX IF NOT EXISTS idx_beast_events_status ON beast_events(status);

-- ============================================
-- 10. 签到记录表（sign_in_records）
-- ============================================
CREATE TABLE IF NOT EXISTS sign_in_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  sign_date DATE NOT NULL,
  continuous_days INTEGER DEFAULT 1,
  reward_gold INTEGER DEFAULT 10,
  reward_exp INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, sign_date)
);

ALTER TABLE sign_in_records ADD CONSTRAINT fk_sign_in_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sign_in_records_user_id ON sign_in_records(user_id);

-- ============================================
-- 11. 金币流水表（gold_transactions）
-- ============================================
CREATE TABLE IF NOT EXISTS gold_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  balance_after INTEGER NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gold_transactions ADD CONSTRAINT fk_gold_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id ON gold_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_created_at ON gold_transactions(created_at DESC);

-- ============================================
-- 12. 内容审核记录表（content_audit_logs）
-- ============================================
CREATE TABLE IF NOT EXISTS content_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('signature', 'post', 'reply')),
  content_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  ai_result VARCHAR(20) CHECK (ai_result IN ('pass', 'review', 'block')),
  ai_confidence DECIMAL(5,2),
  manual_result VARCHAR(20) CHECK (manual_result IN ('approved', 'rejected')),
  auditor_id BIGINT,
  audit_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_audit_logs_content ON content_audit_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_audit_logs_user_id ON content_audit_logs(user_id);

-- ============================================
-- 13. 守护灵话术模板表（agent_templates）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_templates (
  id SERIAL PRIMARY KEY,
  agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('mechanic', 'elf', 'astrologer')),
  trigger_event VARCHAR(50) NOT NULL,
  template_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (agent_type, trigger_event)
);

COMMENT ON TABLE agent_templates IS '守护灵话术模板表';

-- 插入初始话术模板
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
  ('mechanic', 'welcome', '检测到新信号。欢迎归巢，编号{user_id}。'),
  ('mechanic', 'sign_in_remind', '今日补给未领取，建议执行。'),
  ('mechanic', 'invite_success', '新坐标已校准，盟友已就位。'),
  ('mechanic', 'level_up', '系统升级完成。你现在更强了。'),
  ('elf', 'welcome', '呜~森林在颤动。你终于来了。'),
  ('elf', 'sign_in_remind', '太阳晒到树梢了，该浇水啦~'),
  ('elf', 'invite_success', '新芽破土了！你的盟友就在旁边。'),
  ('elf', 'level_up', '古树长高了。你正在变得强大。'),
  ('astrologer', 'welcome', '星辰轨迹中，我看到了你的到来。'),
  ('astrologer', 'sign_in_remind', '星盘显示，今日宜签到。'),
  ('astrologer', 'invite_success', '命运之线已连接，盟友就在你身旁。'),
  ('astrologer', 'level_up', '星力涌动。你的境界突破了。')
ON CONFLICT (agent_type, trigger_event) DO NOTHING;

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

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_posts_updated_at BEFORE UPDATE ON club_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_replies_updated_at BEFORE UPDATE ON post_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_audit_logs_updated_at BEFORE UPDATE ON content_audit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'GamDen数据库Schema（PostgreSQL版本）创建完成！';
END $$;
