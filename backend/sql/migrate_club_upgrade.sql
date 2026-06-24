-- GamDen 俱乐部升级系统迁移脚本 V1.0
-- 创建时间: 2026-06-24
-- 功能: 扩展 clubs 表、新增提议/成员/联署表、预置俱乐部数据

-- ============================================
-- 1. 扩展 clubs 表 - 添加升级系统字段
-- ============================================
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS club_type VARCHAR(20) DEFAULT 'game' 
  CHECK (club_type IN ('default', 'interest', 'game', 'custom'));
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS join_type VARCHAR(20) DEFAULT 'free' 
  CHECK (join_type IN ('auto', 'free', 'approval'));
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality INTEGER DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality_level VARCHAR(20) DEFAULT 'bronze' 
  CHECK (vitality_level IN ('bronze', 'silver', 'gold', 'diamond'));
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS game_name_ext VARCHAR(50);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '🏠';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS endorsement_count INTEGER DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS endorsement_deadline TIMESTAMP;

-- 移除旧约束（如果存在）
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_status_check;
ALTER TABLE clubs ADD CONSTRAINT clubs_status_check 
  CHECK (status IN ('active', 'dormant', 'archived', 'closed'));

-- 添加备注
COMMENT ON COLUMN clubs.club_type IS '俱乐部类型: default/interest/game/custom';
COMMENT ON COLUMN clubs.tags IS '兴趣标签数组';
COMMENT ON COLUMN clubs.join_type IS '加入方式: auto(自动)/free(自由)/approval(审批)';
COMMENT ON COLUMN clubs.vitality IS '活力值';
COMMENT ON COLUMN clubs.vitality_level IS '活力等级: bronze/silver/gold/diamond';
COMMENT ON COLUMN clubs.vitality_updated_at IS '活力值最后更新时间';
COMMENT ON COLUMN clubs.game_name_ext IS '扩展游戏名称';
COMMENT ON COLUMN clubs.icon IS '俱乐部图标emoji';
COMMENT ON COLUMN clubs.endorsement_count IS '联署支持数';
COMMENT ON COLUMN clubs.endorsement_deadline IS '联署截止时间';

-- ============================================
-- 2. 新建 club_members 表 - 俱乐部成员关系
-- ============================================
CREATE TABLE IF NOT EXISTS club_members (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_role ON club_members(role);

COMMENT ON TABLE club_members IS '俱乐部成员关系表';
COMMENT ON COLUMN club_members.role IS '成员角色: member/moderator/owner';

-- ============================================
-- 3. 新建 club_proposals 表 - 俱乐部提议
-- ============================================
CREATE TABLE IF NOT EXISTS club_proposals (
  id BIGSERIAL PRIMARY KEY,
  proposer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200) NOT NULL,
  proposal_type VARCHAR(20) DEFAULT 'other' CHECK (proposal_type IN ('game', 'interest', 'other')),
  game_name VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  endorsement_count INTEGER DEFAULT 0,
  endorsement_deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by BIGINT REFERENCES users(id),
  review_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_proposals_proposer_id ON club_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_club_proposals_status ON club_proposals(status);
CREATE INDEX IF NOT EXISTS idx_club_proposals_created_at ON club_proposals(created_at DESC);

COMMENT ON TABLE club_proposals IS '俱乐部提议表';

-- ============================================
-- 4. 新建 club_endorsements 表 - 联署记录
-- ============================================
CREATE TABLE IF NOT EXISTS club_endorsements (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT NOT NULL REFERENCES club_proposals(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_endorsements_proposal_id ON club_endorsements(proposal_id);
CREATE INDEX IF NOT EXISTS idx_club_endorsements_user_id ON club_endorsements(user_id);

COMMENT ON TABLE club_endorsements IS '俱乐部提议联署记录表';

-- ============================================
-- 5. 新建 club_vitality_logs 表 - 活力值日志
-- ============================================
CREATE TABLE IF NOT EXISTS club_vitality_logs (
  id BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_vitality_logs_club_id ON club_vitality_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_club_vitality_logs_created_at ON club_vitality_logs(created_at DESC);

COMMENT ON TABLE club_vitality_logs IS '俱乐部活力值变动日志';

-- ============================================
-- 6. 预置俱乐部数据
-- ============================================

-- 6.1 默认俱乐部：闲云茶馆
INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
VALUES ('闲云茶馆', '闲聊', '南来北往的客官，进来喝杯茶再走。所有玩家自动加入。', 
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  'default', 'auto', '{"闲聊", "交友"}', 0, 'bronze', '🍵', '闲聊', 'active')
ON CONFLICT (name) DO NOTHING;

-- 6.2 兴趣俱乐部（7个）
INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
VALUES 
  ('演武场', '竞技', '喜欢PVP、竞技、天梯排名的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"pvp", "竞技", "对战"}', 0, 'bronze', '⚔️', '竞技'),
  ('农耕社', '休闲', '喜欢种田、收集、养成、轻松玩法的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"休闲", "收集", "种田"}', 0, 'bronze', '🌾', '休闲'),
  ('工匠坊', '建造', '喜欢建造、经营、策略规划的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"建造", "经营", "策略"}', 0, 'bronze', '🏗️', '建造'),
  ('戏台', '剧情', '喜欢剧情、角色扮演、二次元的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"剧情", "RPG", "二次元"}', 0, 'bronze', '🎭', '剧情'),
  ('画师阁', '创作', '喜欢分享截图、创作、美术的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"创作", "截图", "美术"}', 0, 'bronze', '📷', '创作'),
  ('酒馆', '社交', '喜欢聊天吹水、交友的玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"社交", "聊天", "交友"}', 0, 'bronze', '🎙️', '社交'),
  ('维修铺', '技术', '数码爱好者、硬件玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'interest', 'free', '{"数码", "硬件", "技术"}', 0, 'bronze', '🔧', '技术')
ON CONFLICT (name) DO NOTHING;

-- 6.3 游戏俱乐部（首批8款热门游戏）
INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
VALUES 
  ('《原神》茶摊', '原神', '聊原神的一切', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"开放世界", "角色扮演", "二次元"}', 0, 'bronze', '🏯', '原神'),
  ('《王者荣耀》茶摊', '王者荣耀', '王者荣耀玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"MOBA", "竞技", "手游"}', 0, 'bronze', '👑', '王者荣耀'),
  ('《金铲铲之战》茶摊', '金铲铲', '金铲铲之战玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"自走棋", "策略", "休闲"}', 0, 'bronze', '�铲', '金铲铲之战'),
  ('《崩坏：星穹铁道》茶摊', '星穹铁道', '崩坏星穹铁道玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"回合制", "RPG", "二次元"}', 0, 'bronze', '🚄', '崩坏：星穹铁道'),
  ('《绝区零》茶摊', '绝区零', '绝区零玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"动作", "RPG", "都市"}', 0, 'bronze', '⚡', '绝区零'),
  ('《永劫无间》茶摊', '永劫无间', '永劫无间玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"动作", "竞技", "武侠"}', 0, 'bronze', '⚔️', '永劫无间'),
  ('《蛋仔派对》茶摊', '蛋仔派对', '蛋仔派对玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"休闲", "派对", "闯关"}', 0, 'bronze', '🥚', '蛋仔派对'),
  ('《和平精英》茶摊', '和平精英', '和平精英玩家聚集地', 
    (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
    'game', 'free', '{"FPS", "射击", "竞技"}', 0, 'bronze', '🎯', '和平精英')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. 创建自动更新 updated_at 的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_club_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_club_proposals_updated_at ON club_proposals;
CREATE TRIGGER update_club_proposals_updated_at BEFORE UPDATE ON club_proposals
  FOR EACH ROW EXECUTE FUNCTION update_club_proposals_updated_at();

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== 俱乐部升级系统迁移完成 ===';
  RAISE NOTICE '新增表: club_members, club_proposals, club_endorsements, club_vitality_logs';
  RAISE NOTICE '扩展表: clubs (club_type, tags, join_type, vitality, vitality_level等)';
  RAISE NOTICE '预置俱乐部: 1个默认 + 7个兴趣 + 8个游戏';
END $$;
