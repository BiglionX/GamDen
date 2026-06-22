-- GamDen 游客模式数据库迁移脚本
-- 创建时间: 2026-06-22
-- 说明: 游客模式体验 + 手机号验证码 + 埋点体系
-- 执行方式: psql -U <user> -d gamden -f migrate_guest_mode.sql

BEGIN;

-- ============================================
-- 1. 扩展 users 表
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(64) DEFAULT NULL COMMENT '设备唯一标识（游客态生成，注册后绑定）';
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(128) DEFAULT NULL COMMENT '微信 openid（微信登录绑定）';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_verified TINYINT DEFAULT 0 COMMENT '是否完成实名认证（0/1）';

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);

-- ============================================
-- 2. 设备访问记录表（device_visits）
-- ============================================
CREATE TABLE IF NOT EXISTS device_visits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备唯一标识',
  first_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '首次访问时间',
  last_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近访问时间',
  page_views INT DEFAULT 0 COMMENT '累计页面浏览数',
  registered_at DATETIME DEFAULT NULL COMMENT '注册时间（游客转化为用户）',
  user_id BIGINT DEFAULT NULL COMMENT '关联的用户ID（注册后绑定）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY uk_device_id (device_id),
  KEY idx_user_id (user_id),
  KEY idx_registered_at (registered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备访问记录表';

-- ============================================
-- 3. 停留时长统计表（dwell_stats）
-- ============================================
CREATE TABLE IF NOT EXISTS dwell_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备唯一标识',
  current_page VARCHAR(50) NOT NULL COMMENT '当前页面（map/club/shop/club_detail）',
  duration_seconds INT DEFAULT 0 COMMENT '累计停留时长（秒）',
  last_heartbeat_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近心跳时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_device_page (device_id, current_page),
  KEY idx_last_heartbeat (last_heartbeat_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='停留时长统计表';

-- ============================================
-- 4. 操作埋点表（action_logs）
-- ============================================
CREATE TABLE IF NOT EXISTS action_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  device_id VARCHAR(64) DEFAULT NULL COMMENT '设备唯一标识（游客态）',
  user_id BIGINT DEFAULT NULL COMMENT '用户ID（登录后）',
  event_name VARCHAR(50) NOT NULL COMMENT '事件名称',
  event_data JSON DEFAULT NULL COMMENT '附加字段（JSON格式）',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
  user_agent VARCHAR(255) DEFAULT NULL COMMENT 'User-Agent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_device_event (device_id, event_name),
  KEY idx_user_event (user_id, event_name),
  KEY idx_event_name (event_name),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作埋点表';

-- ============================================
-- 5. 短信验证码表（sms_codes）
-- ============================================
CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  phone VARCHAR(20) NOT NULL COMMENT '手机号',
  code VARCHAR(6) NOT NULL COMMENT '验证码（6位数字）',
  purpose ENUM('register', 'login', 'reset_pwd') NOT NULL COMMENT '用途',
  is_used TINYINT DEFAULT 0 COMMENT '是否已使用（0/1）',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  KEY idx_phone_purpose (phone, purpose),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码表';

-- ============================================
-- 6. 存储过程：合并游客数据到用户
-- ============================================
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS MergeGuestData(
  IN p_device_id VARCHAR(64),
  IN p_user_id BIGINT
)
BEGIN
  -- 更新 action_logs 关联用户
  UPDATE action_logs 
  SET user_id = p_user_id 
  WHERE device_id = p_device_id AND user_id IS NULL;
  
  -- 更新 dwell_stats 关联用户（可选，按需保留）
  -- UPDATE dwell_stats SET user_id = p_user_id WHERE device_id = p_device_id;
  
  -- 更新 device_visits 绑定用户
  UPDATE device_visits 
  SET user_id = p_user_id, 
      registered_at = NOW() 
  WHERE device_id = p_device_id;
  
  -- 清理过期数据（30天前的未绑定设备记录）
  DELETE FROM device_visits 
  WHERE registered_at IS NULL 
    AND last_visit_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
  DELETE FROM dwell_stats 
  WHERE last_heartbeat_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
  
END$$

DELIMITER ;

-- ============================================
-- 完成提示
-- ============================================
SELECT 'GamDen 游客模式数据库迁移完成！' AS message;

COMMIT;
