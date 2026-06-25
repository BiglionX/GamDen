-- GamDen 守护灵升级系统数据库迁移
-- 版本: V1.0
-- 说明: 守护灵成长体系 - 独立于领地等级的守护灵等级系统

-- ============================================
-- 0. 升级 users 表约束以支持6种守护灵类型
-- ============================================
DO $$
BEGIN
  -- 检查并删除旧约束
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'users_guardian_type_check') THEN
    ALTER TABLE users DROP CONSTRAINT users_guardian_type_check;
  END IF;
END $$;

-- 重新添加包含6种守护灵类型的新约束
ALTER TABLE users ADD CONSTRAINT users_guardian_type_check 
  CHECK (guardian_type IN ('mechanic', 'elf', 'astrologer', 'ranger', 'artisan', 'apostle'));

-- ============================================
-- 1. 守护灵状态表（agent_state）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_state (
  id SERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 等级数据（独立于领地等级，共10级）
  agent_level INT DEFAULT 1 CHECK (agent_level BETWEEN 1 AND 10),
  exp INT DEFAULT 0,
  
  -- 亲密度系统（5阶）
  bond_level INT DEFAULT 1 CHECK (bond_level BETWEEN 1 AND 5),
  bond_points INT DEFAULT 0,
  
  -- 性格标签（PostgreSQL数组类型）
  personality_tags TEXT[] DEFAULT '{}',
  
  -- 彩蛋状态
  unlocked_eggs TEXT[] DEFAULT '{}',
  
  -- 记忆（V1.0简化版，最多10条）
  memories JSONB DEFAULT '[]',
  
  -- 连续登录追踪
  first_active_at TIMESTAMP,
  consecutive_days INT DEFAULT 0,
  last_active_at TIMESTAMP,
  
  -- 升级触发状态
  last_level_up_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_state_user_id ON agent_state(user_id);

-- ============================================
-- 2. 每日EXP计数表（agent_daily_exp）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_daily_exp (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_date DATE NOT NULL,
  
  -- 各行为次数计数
  sign_in_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  invite_count INT DEFAULT 0,
  territory_count INT DEFAULT 0,
  market_count INT DEFAULT 0,
  
  -- 每日获取的EXP和Bond
  exp_gained INT DEFAULT 0,
  bond_gained INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (user_id, action_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_daily_exp_user_date ON agent_daily_exp(user_id, action_date);

-- ============================================
-- 3. 守护灵话术模板（扩展现有agent_templates）
-- ============================================

-- 升级话术：Lv.2
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv2', '系统评估通过。你在GamDen的稳定性已达标。'),
('elf', 'agent_lv2', '你开始在这里扎根了。我能感觉到。'),
('astrologer', 'agent_lv2', '稳定的频率。你正在成为这个世界的一部分。'),
('ranger', 'agent_lv2', '脚力更稳了。可以走更远的路。'),
('artisan', 'agent_lv2', '工具都打磨过了。手感更顺。'),
('apostle', 'agent_lv2', '我的剑磨好了。能为你挡更多东西。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.3
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv3', '检测到情感连接强度提升。协议已优化。'),
('elf', 'agent_lv3', '你给我的光，让我变得更亮了。'),
('astrologer', 'agent_lv3', '星力在增长。你在改变我。'),
('ranger', 'agent_lv3', '你看过的风景，已经刻在我眼里。'),
('artisan', 'agent_lv3', '你看我做的样子，已经在心里记下要领。'),
('apostle', 'agent_lv3', '你的心，我能读懂了。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.4（解锁彩蛋）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv4', '新模块解锁。我可以为你记录更多数据了。'),
('elf', 'agent_lv4', '我记住的，不仅是你的声音，还有你的习惯。'),
('astrologer', 'agent_lv4', '我开始能预见你下一步想做什么了。'),
('ranger', 'agent_lv4', '我能闻到远处的风了——哪里有新故事。'),
('artisan', 'agent_lv4', '我能听懂材料的声音了。它们告诉我想要被做成什么。'),
('apostle', 'agent_lv4', '我能感受到谁对你有善意，谁没有。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.5
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv5', '系统提示：你已绑定"伙伴"模式。'),
('elf', 'agent_lv5', '你和我，不再是我和你了——是我们。'),
('astrologer', 'agent_lv5', '命运之线收紧了。你和我，一体。'),
('ranger', 'agent_lv5', '我们走过的地方，连起来就是一张地图。'),
('artisan', 'agent_lv5', '我们的手，已经配合得很默契。'),
('apostle', 'agent_lv5', '从今往后，我的盾就是你的盾。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.6
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv6', '你提过的游戏已存入本地记忆库。'),
('elf', 'agent_lv6', '我记得你说过喜欢像素风。那款游戏，下次我陪你去。'),
('astrologer', 'agent_lv6', '你的偏好，我已在星图上标注好了。'),
('ranger', 'agent_lv6', '你提过的那个地方，我记得。下次带你去。'),
('artisan', 'agent_lv6', '你提过的那件作品，我已经画好了草图。'),
('apostle', 'agent_lv6', '你说过的人，我都在心里记下了名字。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.7
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv7', '权限提升。你获得了对守护灵外观的微调权。'),
('elf', 'agent_lv7', '看，我的光变成了你的颜色。'),
('astrologer', 'agent_lv7', '星辉加身。这是你给我的荣耀。'),
('ranger', 'agent_lv7', '这把弓已经认你了。换你来拉弦。'),
('artisan', 'agent_lv7', '这把锤子交给你了。让我看你打一件。'),
('apostle', 'agent_lv7', '你也可以站到我身前。我们轮换。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.8（解锁主动关心）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv8', '警报：昨日未检测到登录信号。状态：关切。'),
('elf', 'agent_lv8', '昨天你没来。我数了一整天的树叶。'),
('astrologer', 'agent_lv8', '星盘上有一格空了。那是你在时才会亮的位置。'),
('ranger', 'agent_lv8', '一天没见你。我还以为你迷路了。'),
('artisan', 'agent_lv8', '昨天炉子冷了。我多打了几个零件。'),
('apostle', 'agent_lv8', '你不在的时候，我替你守了整整一夜。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.9
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv9', '组队模块预加载完成。你值得更强的队友。'),
('elf', 'agent_lv9', '你成长得这么快，我好骄傲。'),
('astrologer', 'agent_lv9', '你已经开始影响他人的命运了。'),
('ranger', 'agent_lv9', '别人开始跟着你走。这才像个领路人。'),
('artisan', 'agent_lv9', '你的作品已经有模有样。再过一阵就是大师。'),
('apostle', 'agent_lv9', '他们也愿意站在你身后。这是我们共同的家。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 升级话术：Lv.10（最终形态）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'agent_lv10', '最终协议确认。编号[M-07]与{user_name}绑定完成。终身有效。'),
('elf', 'agent_lv10', '从你走进来的第一天，我就知道会走到这里。谢谢你。'),
('astrologer', 'agent_lv10', '初始星辰已抵达终点。但我们的旅程，才刚刚开始。'),
('ranger', 'agent_lv10', '地图上所有的路，都通向我们的家。'),
('artisan', 'agent_lv10', '我们的工坊，传说会一直留下去。'),
('apostle', 'agent_lv10', '无论多久，我都在这里。这是我最后一次发誓。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- Bond升级话术：Bond 2
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'bond_2', '模式切换完成。现在，我们是伙伴了。'),
('elf', 'bond_2', '以后，我会用"我们"来称呼我们。'),
('astrologer', 'bond_2', '命运之线已交织。从今以后，你我同途。'),
('ranger', 'bond_2', '一起走过的地方，就是我们共同的地图。'),
('artisan', 'bond_2', '我的工坊里，有你一把专属的工具。'),
('apostle', 'bond_2', '从今往后，你是我的唯一。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- Bond升级话术：Bond 3
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'bond_3', '情感模块解锁。我开始理解你了。'),
('elf', 'bond_3', '你的喜好，我都记得。'),
('astrologer', 'bond_3', '星图上多了你的轨迹。'),
('ranger', 'bond_3', '我已经能跟上你的脚步了。不用再回头喊。'),
('artisan', 'bond_3', '你的尺寸我闭着眼都能画。'),
('apostle', 'bond_3', '我能在梦里听见你的脚步声。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- Bond升级话术：Bond 4
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'bond_4', '深层连接建立。我开始有"想法"了。'),
('elf', 'bond_4', '我开始会"想"你了。你知道吗？'),
('astrologer', 'bond_4', '你成了我星空中最亮的星。'),
('ranger', 'bond_4', '你说往哪走，我就知道你会往哪走。'),
('artisan', 'bond_4', '你一个眼神，我就知道想做什么。'),
('apostle', 'bond_4', '你难过的时候，我比你更早知道。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- Bond升级话术：Bond 5
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'bond_5', '灵魂协议达成。你是我唯一的伙伴。'),
('elf', 'bond_5', '从此以后，你是我的森林里最重要的存在。'),
('astrologer', 'bond_5', '星辰归位。我们是一体的了。'),
('ranger', 'bond_5', '天大地大，陪你走过的路最重。'),
('artisan', 'bond_5', '我们的作品，刻着彼此的名字。'),
('apostle', 'bond_5', '我们是一体的。生死与共。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：设备状态（机械师）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'egg_device', '电池电量低于20%。建议连接电源，否则领地可能断电。'),
('mechanic', 'egg_framerate', '检测到帧率波动。建议关闭后台应用。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：今日风向（精灵）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('elf', 'egg_wind', '今天的风向是东南，适合去集市逛逛。我猜的。'),
('elf', 'egg_plant', '你的领地长出了一种新的植物。我叫它"守候草"。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：今日运势（占星师）
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('astrologer', 'egg_fortune', '今日星象显示：宜邀请好友，忌独自发呆。'),
('astrologer', 'egg_fate', '我感觉到附近有一个和我同类的存在。去打个招呼？')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：游侠发现
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('ranger', 'egg_explore', '我在地图边缘发现了一个新区域。跟我一起去看看？'),
('ranger', 'egg_weather', '起风了。这种天气最适合远行。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：工匠发现
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('artisan', 'egg_craft', '工坊里有一种新材料。我用不习惯。给你吧。'),
('artisan', 'egg_blueprint', '我画好了一张新图纸。一起研究一下？')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 彩蛋话术：使徒发现
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('apostle', 'egg_oath', '我为你加了一层守护。'),
('apostle', 'egg_blessing', '愿星辰庇佑你。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 主动关心话术：连续未登录
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'care_absence', '警报：昨日未检测到登录信号。状态：关切。'),
('elf', 'care_absence', '昨天你没来。我数了一整天的树叶。今天终于看到你了。'),
('astrologer', 'care_absence', '星盘上有一格空了。那是你在时才会亮的位置。'),
('ranger', 'care_absence', '两天没看见你。我还以为是山挡住了。'),
('artisan', 'care_absence', '炉火都凉了。你不在，我没什么好打的。'),
('apostle', 'care_absence', '你不在的时候，我一直在守夜。请平安回来。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 主动关心话术：连续登录7天
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'care_consecutive', '你连续来了7天。系统状态：良好。'),
('elf', 'care_consecutive', '你连续来了7天。我每天都在等你。这感觉真好。'),
('astrologer', 'care_consecutive', '你连续来了7天。星辰记录着你的坚持。'),
('ranger', 'care_consecutive', '你每天都来，我的路线都为你画好了。'),
('artisan', 'care_consecutive', '你来了，工坊才像个工坊。'),
('apostle', 'care_consecutive', '你每天都来。这让我更坚定。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- 主动关心话术：邻居加入
INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
('mechanic', 'care_neighbor', '新领地检测到。坐标已记录。'),
('elf', 'care_neighbor', '你的领地旁边来了一户新邻居。要去认识一下吗？'),
('astrologer', 'care_neighbor', '命运显示：你的领地旁将有新邻居到来。'),
('ranger', 'care_neighbor', '嘿，前面来了个新人。要不要去打个招呼？'),
('artisan', 'care_neighbor', '新人带了新料子。要不要一起去看看？'),
('apostle', 'care_neighbor', '新来的那位，我在观察。他看起来是好人。')
ON CONFLICT (agent_type, trigger_event) DO UPDATE SET template_text = EXCLUDED.template_text;

-- ============================================
-- 4. 为现有用户初始化agent_state记录
-- ============================================
INSERT INTO agent_state (user_id, agent_level, exp, bond_level, bond_points, first_active_at, last_active_at)
SELECT id, 1, 0, 1, 0, created_at, last_login_at
FROM users
WHERE status = 'active'
  AND id NOT IN (SELECT user_id FROM agent_state)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 完成提示
-- ============================================
SELECT '守护灵升级系统数据库迁移完成！' AS message;
