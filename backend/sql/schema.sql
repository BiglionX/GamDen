-- GamDen数据库Schema V1.0
-- 创建时间: 2026-06-22
-- 说明: 游戏巢穴社区数据库结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS gamden 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE gamden;

-- ============================================
-- 1. 用户表（users）
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  phone VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希（bcrypt）',
  nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '用户昵称',
  avatar VARCHAR(255) DEFAULT '' COMMENT '头像URL',
  guardian_type ENUM('mechanic', 'elf', 'astrologer', 'ranger', 'artisan', 'apostle') NOT NULL COMMENT '守护灵类型',
  level INT DEFAULT 1 COMMENT '领地等级（1~5）',
  exp INT DEFAULT 0 COMMENT '当前经验值',
  invite_code VARCHAR(10) UNIQUE NOT NULL COMMENT '个人邀请码（6位字母数字）',
  invited_by BIGINT COMMENT '邀请人ID（FK -> users.id）',
  territory_coord_x INT NOT NULL COMMENT '领地X坐标（-1000~+1000）',
  territory_coord_y INT NOT NULL COMMENT '领地Y坐标（-1000~+1000）',
  signature VARCHAR(20) DEFAULT '' COMMENT '个性签名（20字）',
  gold_coins INT DEFAULT 100 COMMENT '金币余额（0~99999）',
  role ENUM('player', 'vip', 'club_admin', 'operator', 'super_admin') DEFAULT 'player' COMMENT '用户角色',
  status ENUM('active', 'frozen', 'deleted') DEFAULT 'active' COMMENT '账号状态',
  last_login_at DATETIME COMMENT '最后登录时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY uk_coord (territory_coord_x, territory_coord_y),
  UNIQUE KEY uk_invite_code (invite_code),
  KEY idx_phone (phone),
  KEY idx_invited_by (invited_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 2. 邀请记录表（invite_records）
-- ============================================
CREATE TABLE IF NOT EXISTS invite_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  inviter_id BIGINT NOT NULL COMMENT '邀请人ID（FK -> users.id）',
  invitee_id BIGINT UNIQUE NOT NULL COMMENT '被邀请人ID（FK -> users.id）',
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '邀请时间',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否活跃（被邀请人活跃7天后变为true）',
  mini_program_generated BOOLEAN DEFAULT FALSE COMMENT '是否已生成小程序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_inviter_id (inviter_id),
  KEY idx_invitee_id (invitee_id),
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请记录表';

-- ============================================
-- 3. 领地演进记录表（territory_evolution）
-- ============================================
CREATE TABLE IF NOT EXISTS territory_evolution (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id BIGINT NOT NULL COMMENT '用户ID（FK -> users.id）',
  level INT NOT NULL COMMENT '领地等级（1~5）',
  icon_url VARCHAR(255) NOT NULL COMMENT '领地元素图URL',
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '解锁时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='领地演进记录表';

-- ============================================
-- 4. 俱乐部表（clubs）
-- ============================================
CREATE TABLE IF NOT EXISTS clubs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '俱乐部ID',
  name VARCHAR(50) NOT NULL COMMENT '俱乐部名称',
  game_name VARCHAR(50) NOT NULL COMMENT '游戏名称',
  description VARCHAR(500) COMMENT '俱乐部描述',
  owner_id BIGINT NOT NULL COMMENT '管理员ID（FK -> users.id）',
  openim_group_id VARCHAR(100) DEFAULT '' COMMENT 'OpenIM群组ID',
  member_count INT DEFAULT 1 COMMENT '成员数',
  post_count INT DEFAULT 0 COMMENT '帖子数',
  last_active_at DATETIME COMMENT '最后活跃时间',
  status ENUM('active', 'closed') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_owner_id (owner_id),
  KEY idx_game_name (game_name),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='俱乐部表';

-- ============================================
-- 5. 俱乐部帖子表（club_posts）
-- ============================================
CREATE TABLE IF NOT EXISTS club_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '帖子ID',
  club_id BIGINT NOT NULL COMMENT '俱乐部ID（FK -> clubs.id）',
  user_id BIGINT NOT NULL COMMENT '发帖人ID（FK -> users.id）',
  content VARCHAR(500) NOT NULL COMMENT '帖子内容',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  reply_count INT DEFAULT 0 COMMENT '回帖数',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_club_id (club_id),
  KEY idx_user_id (user_id),
  KEY idx_status (status),
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='俱乐部帖子表';

-- ============================================
-- 6. 帖子回复表（post_replies）
-- ============================================
CREATE TABLE IF NOT EXISTS post_replies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '回复ID',
  post_id BIGINT NOT NULL COMMENT '帖子ID（FK -> club_posts.id）',
  user_id BIGINT NOT NULL COMMENT '回复人ID（FK -> users.id）',
  content VARCHAR(200) NOT NULL COMMENT '回复内容',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' COMMENT '审核状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_post_id (post_id),
  KEY idx_user_id (user_id),
  FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子回复表';

-- ============================================
-- 7. Agent对话日志表（agent_dialogues）
-- ============================================
CREATE TABLE IF NOT EXISTS agent_dialogues (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id BIGINT NOT NULL COMMENT '用户ID（FK -> users.id）',
  agent_type ENUM('mechanic', 'elf', 'astrologer') NOT NULL COMMENT '守护灵类型',
  trigger_event VARCHAR(50) NOT NULL COMMENT '触发事件（sign_in/level_up/invite_success等）',
  response_text TEXT NOT NULL COMMENT 'Agent回复内容',
  delivered_at DATETIME COMMENT '送达时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent对话日志表';

-- ============================================
-- 8. 个人小程序生成记录表（mini_programs）
-- ============================================
CREATE TABLE IF NOT EXISTS mini_programs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id BIGINT UNIQUE NOT NULL COMMENT '用户ID（FK -> users.id）',
  qr_code_url VARCHAR(255) NOT NULL COMMENT '小程序码URL',
  page_path VARCHAR(255) NOT NULL COMMENT '小程序页面路径',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='个人小程序生成记录表';

-- ============================================
-- 9. 野兽潮事件表（beast_events）
-- ============================================
CREATE TABLE IF NOT EXISTS beast_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '事件ID',
  event_level INT NOT NULL COMMENT '野兽潮等级（1~5）',
  coord_x INT NOT NULL COMMENT '触发坐标X',
  coord_y INT NOT NULL COMMENT '触发坐标Y',
  affected_users JSON COMMENT '受影响用户ID数组',
  status ENUM('active', 'resolved') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  resolved_at DATETIME COMMENT '解决时间',
  
  KEY idx_coord (coord_x, coord_y),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='野兽潮事件表';

-- ============================================
-- 10. 签到记录表（sign_in_records）
-- ============================================
CREATE TABLE IF NOT EXISTS sign_in_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id BIGINT NOT NULL COMMENT '用户ID（FK -> users.id）',
  sign_date DATE NOT NULL COMMENT '签到日期',
  continuous_days INT DEFAULT 1 COMMENT '连续签到天数',
  reward_gold INT DEFAULT 10 COMMENT '奖励金币',
  reward_exp INT DEFAULT 10 COMMENT '奖励经验',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  UNIQUE KEY uk_user_date (user_id, sign_date),
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='签到记录表';

-- ============================================
-- 11. 金币流水表（gold_transactions）
-- ============================================
CREATE TABLE IF NOT EXISTS gold_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '流水ID',
  user_id BIGINT NOT NULL COMMENT '用户ID（FK -> users.id）',
  transaction_type ENUM('earn', 'spend') NOT NULL COMMENT '交易类型（赚取/消费）',
  amount INT NOT NULL COMMENT '金额',
  source VARCHAR(50) NOT NULL COMMENT '来源（sign_in/post/invite/defend等）',
  balance_after INT NOT NULL COMMENT '交易后余额',
  description VARCHAR(255) COMMENT '描述',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='金币流水表';

-- ============================================
-- 12. 内容审核记录表（content_audit_logs）
-- ============================================
CREATE TABLE IF NOT EXISTS content_audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  content_type ENUM('signature', 'post', 'reply') NOT NULL COMMENT '内容类型',
  content_id BIGINT NOT NULL COMMENT '内容ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  ai_result ENUM('pass', 'review', 'block') COMMENT 'AI审核结果',
  ai_confidence DECIMAL(5,2) COMMENT 'AI置信度',
  manual_result ENUM('approved', 'rejected') COMMENT '人工审核结果',
  auditor_id BIGINT COMMENT '审核员ID',
  audit_reason VARCHAR(255) COMMENT '审核原因',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_content (content_type, content_id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容审核记录表';

-- ============================================
-- 索引优化
-- ============================================
-- 用户表索引
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 帖子表索引
CREATE INDEX idx_posts_created_at ON club_posts(created_at DESC);

-- 回复表索引
CREATE INDEX idx_replies_created_at ON post_replies(created_at DESC);

-- ============================================
-- 初始数据
-- ============================================

-- 插入超级管理员账号（密码：Admin@123，需要bcrypt加密）
-- 实际部署时通过脚本生成

-- 插入守护灵话术模板
CREATE TABLE IF NOT EXISTS agent_templates (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '模板ID',
  agent_type ENUM('mechanic', 'elf', 'astrologer') NOT NULL COMMENT '守护灵类型',
  trigger_event VARCHAR(50) NOT NULL COMMENT '触发事件',
  template_text TEXT NOT NULL COMMENT '话术模板',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  UNIQUE KEY uk_type_event (agent_type, trigger_event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='守护灵话术模板表';

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
('astrologer', 'level_up', '星力涌动。你的境界突破了。');

-- ============================================
-- 存储过程：分配领地坐标
-- ============================================
DELIMITER $$

CREATE PROCEDURE AllocateTerritoryCoord(
  IN p_inviter_id BIGINT,
  OUT p_coord_x INT,
  OUT p_coord_y INT
)
BEGIN
  DECLARE v_inviter_x INT DEFAULT NULL;
  DECLARE v_inviter_y INT DEFAULT NULL;
  DECLARE v_attempts INT DEFAULT 0;
  
  -- 如果有邀请人，获取邀请人坐标
  IF p_inviter_id IS NOT NULL AND p_inviter_id > 0 THEN
    SELECT territory_coord_x, territory_coord_y 
    INTO v_inviter_x, v_inviter_y
    FROM users 
    WHERE id = p_inviter_id;
  END IF;
  
  -- 尝试在邀请人周围±10格内分配
  IF v_inviter_x IS NOT NULL THEN
    WHILE v_attempts < 100 DO
      SET p_coord_x = v_inviter_x + FLOOR(RAND() * 21) - 10;
      SET p_coord_y = v_inviter_y + FLOOR(RAND() * 21) - 10;
      
      -- 检查坐标是否被占用
      IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE territory_coord_x = p_coord_x 
          AND territory_coord_y = p_coord_y
      ) THEN
        LEAVE ALLOCATE_TERRITORY_COORD;
      END IF;
      
      SET v_attempts = v_attempts + 1;
    END WHILE;
  END IF;
  
  -- 如果无法在邀请人周围分配，则全图随机
  SET v_attempts = 0;
  WHILE v_attempts < 1000 DO
    SET p_coord_x = FLOOR(RAND() * 2001) - 1000;
    SET p_coord_y = FLOOR(RAND() * 2001) - 1000;
    
    -- 检查坐标是否被占用
    IF NOT EXISTS (
      SELECT 1 FROM users 
      WHERE territory_coord_x = p_coord_x 
        AND territory_coord_y = p_coord_y
    ) THEN
      LEAVE ALLOCATE_TERRITORY_COORD;
    END IF;
    
    SET v_attempts = v_attempts + 1;
  END WHILE;
  
  -- 如果还是失败，向右偏移直到找到空位
  IF v_inviter_x IS NOT NULL THEN
    SET p_coord_x = v_inviter_x + 11;
    SET p_coord_y = v_inviter_y;
  ELSE
    SET p_coord_x = 0;
    SET p_coord_y = 0;
  END IF;
  
  WHILE EXISTS (
    SELECT 1 FROM users 
    WHERE territory_coord_x = p_coord_x 
      AND territory_coord_y = p_coord_y
  ) DO
    SET p_coord_x = p_coord_x + 1;
  END WHILE;
  
END$$

DELIMITER ;

-- ============================================
-- 完成提示
-- ============================================
SELECT 'GamDen数据库Schema创建完成！' AS message;
