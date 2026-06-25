-- GamDen 守护灵智能升级系统数据库迁移
-- 版本: V1.1
-- 说明: AI智能对话系统 - 上下文记忆、Token能量、降智机制

-- ============================================
-- 1. 扩展 agent_state 表（Token能量字段）
-- ============================================

-- 检查并添加新字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'agent_state' AND column_name = 'daily_token_used') THEN
    ALTER TABLE agent_state ADD COLUMN daily_token_used INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'agent_state' AND column_name = 'purchased_token_balance') THEN
    ALTER TABLE agent_state ADD COLUMN purchased_token_balance INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'agent_state' AND column_name = 'last_token_reset_at') THEN
    ALTER TABLE agent_state ADD COLUMN last_token_reset_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 2. 守护灵对话记录表（agent_conversations）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  tokens_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(user_id, created_at DESC);

-- ============================================
-- 3. 守护灵长期记忆表（agent_memories）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type VARCHAR(20) NOT NULL CHECK (memory_type IN ('game_preference', 'emotion', 'habit', 'relationship', 'other')),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(user_id, memory_type);

-- ============================================
-- 4. Token购买记录表（agent_token_purchases）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_token_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id VARCHAR(20) NOT NULL CHECK (package_id IN ('small', 'medium', 'large')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_token_purchases_user_id ON agent_token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_token_purchases_status ON agent_token_purchases(payment_status);

-- ============================================
-- 5. 每日Token使用记录表（agent_daily_token_usage）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_daily_token_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, usage_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_daily_token_usage_user_date ON agent_daily_token_usage(user_id, usage_date DESC);

-- ============================================
-- 6. 插入降智模式话术
-- ============================================

-- 机械师降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'ai_depleted', '能量耗尽。进入省电模式。如需继续智能对话，请补充灵力。'),
('mechanic', 'ai_low_energy', '能量储备低于30%。建议及时补充灵力以保证智能对话质量。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 精灵降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('elf', 'ai_depleted', '我今天好累哦……先睡一会儿，明天再陪你说话好吗？'),
('elf', 'ai_low_energy', '灵力有点不够用了……补充一点我就能陪你更久哦~')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 占星师降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('astrologer', 'ai_depleted', '星力枯竭。今日的演算到此为止。明日星辉重聚时，我们再谈。'),
('astrologer', 'ai_low_energy', '星辰的光芒正在减弱。补充星力后，我能看到更多关于你的事。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 游侠降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('ranger', 'ai_depleted', '体力透支了……让我歇一会儿，明天再带你去看新的风景。'),
('ranger', 'ai_low_energy', '脚步有点沉了。补充点体力，我就能陪你走更远。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 工匠降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('artisan', 'ai_depleted', '锤子和凿子都拿不动了……让我打个盹，明天再开工。'),
('artisan', 'ai_low_energy', '炉火不太旺了。加点燃料，我就能打出更好的作品。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 使徒降智话术
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('apostle', 'ai_depleted', '盾牌太重了……请让我休息片刻。'),
('apostle', 'ai_low_energy', '守护之力有些不足。补充灵力后，我能更好地守护你。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- ============================================
-- 7. 为现有用户初始化Token字段
-- ============================================
UPDATE agent_state 
SET daily_token_used = 0,
    purchased_token_balance = 0,
    last_token_reset_at = NOW()
WHERE daily_token_used IS NULL OR daily_token_used = 0;

-- ============================================
-- 8. 初始化每日Token使用记录
-- ============================================
INSERT INTO agent_daily_token_usage (user_id, usage_date, tokens_used, request_count)
SELECT user_id, CURRENT_DATE, 0, 0
FROM agent_state
WHERE user_id NOT IN (
  SELECT user_id FROM agent_daily_token_usage WHERE usage_date = CURRENT_DATE
)
ON CONFLICT (user_id, usage_date) DO NOTHING;

-- ============================================
-- 完成提示
-- ============================================
SELECT '守护灵智能升级系统数据库迁移完成！' AS message;
