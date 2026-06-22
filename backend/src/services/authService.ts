import { dbPool } from '../config/database';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateToken, generateRefreshToken, verifyToken, JWTPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import { verifySmsCode } from './smsService';
import { triggerWelcome } from './agentService';

export interface RegisterParams {
  phone: string;
  password: string;
  invite_code: string;
  guardian_type: 'mechanic' | 'elf' | 'astrologer';
  nickname?: string;
  device_id?: string;
}

export interface LoginParams {
  phone: string;
  password: string;
  device_id?: string;
}

export interface RegisterByPhoneParams {
  phone: string;
  sms_code: string;
  invite_code: string;
  guardian_type: 'mechanic' | 'elf' | 'astrologer';
  nickname?: string;
  device_id?: string;
}

export interface LoginByPhoneParams {
  phone: string;
  sms_code: string;
  device_id?: string;
}

export interface AuthResult {
  token: string;
  refresh_token: string;
  user_id: number;
  territory_coord_x: number;
  territory_coord_y: number;
}

/**
 * 验证邀请码（含30天有效期检查）
 */
const validateInviteCode = async (inviteCode: string): Promise<number | null> => {
  const result: any = await dbPool.query(
    `SELECT id, created_at FROM users
     WHERE invite_code = $1 AND status = 'active'
     AND created_at >= NOW() - INTERVAL '30 days'`,
    [inviteCode]
  );

  const rows = result.rows;
  if (rows.length === 0) {
    // 检查邀请码是否存在但已过期
    const expiredResult: any = await dbPool.query(
      'SELECT id FROM users WHERE invite_code = $1 AND status = \'active\' AND created_at < NOW() - INTERVAL \'30 days\'',
      [inviteCode]
    );
    if (expiredResult.rows.length > 0) {
      throw new Error('邀请码已过期（超过30天）');
    }
    return null;
  }

  return rows[0].id;
};

/**
 * 生成唯一邀请码
 */
const generateInviteCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists: boolean;
  
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const result: any = await dbPool.query(
      'SELECT id FROM users WHERE invite_code = $1',
      [code]
    );
    const rows = result.rows;
    exists = rows.length > 0;
  } while (exists);
  
  return code;
};

/**
 * 分配领地坐标
 */
const allocateTerritoryCoord = async (inviterId: number | null): Promise<{ x: number; y: number }> => {
  let x: number, y: number;
  let attempts = 0;
  
  do {
    if (inviterId) {
      // 获取邀请人坐标
      const result: any = await dbPool.query(
        'SELECT territory_coord_x, territory_coord_y FROM users WHERE id = $1',
        [inviterId]
      );
      const inviterRows = result.rows;
      
      if (inviterRows.length > 0) {
        const inviterX = inviterRows[0].territory_coord_x;
        const inviterY = inviterRows[0].territory_coord_y;
        
        // 在邀请人周围±10格内随机分配
        x = inviterX + Math.floor(Math.random() * 21) - 10;
        y = inviterY + Math.floor(Math.random() * 21) - 10;
      } else {
        // 邀请人不存在，全图随机
        x = Math.floor(Math.random() * 2001) - 1000;
        y = Math.floor(Math.random() * 2001) - 1000;
      }
    } else {
      // 无邀请人，全图随机
      x = Math.floor(Math.random() * 2001) - 1000;
      y = Math.floor(Math.random() * 2001) - 1000;
    }
    
    // 检查坐标是否被占用
    const result: any = await dbPool.query(
      'SELECT id FROM users WHERE territory_coord_x = $1 AND territory_coord_y = $2',
      [x, y]
    );
    const existingRows = result.rows;
    
    if (existingRows.length === 0) {
      break;
    }
    
    // 如果坐标被占用，向右偏移
    x += 1;
    attempts++;
  } while (attempts < 1000);
  
  return { x, y };
};

/**
 * 用户注册
 */
export const register = async (params: RegisterParams): Promise<AuthResult> => {
  const { phone, password, invite_code, guardian_type, nickname, device_id } = params;

  // 检查同一设备是否已注册
  if (device_id) {
    const deviceResult: any = await dbPool.query(
      'SELECT id FROM users WHERE device_id = $1 AND status != \'deleted\'',
      [device_id]
    );
    if (deviceResult.rows.length > 0) {
      throw new Error('该设备已注册账号，不可重复注册');
    }
  }

  // 检查手机号是否已注册
  const existingResult: any = await dbPool.query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );
  
  if (existingResult.rows.length > 0) {
    throw new Error('手机号已注册');
  }
  
  // 验证邀请码
  const inviterId = await validateInviteCode(invite_code);
  if (!inviterId) {
    throw new Error('邀请码无效或已过期');
  }
  
  // 加密密码
  const passwordHash = await hashPassword(password);
  
  // 生成个人邀请码
  const personalInviteCode = await generateInviteCode();
  
  // 分配领地坐标
  const { x, y } = await allocateTerritoryCoord(inviterId);
  
  // 插入用户记录（PostgreSQL使用RETURNING获取插入的ID）
  const insertResult: any = await dbPool.query(
    `INSERT INTO users (
      phone, password_hash, nickname, guardian_type, 
      invite_code, invited_by, 
      territory_coord_x, territory_coord_y
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      phone,
      passwordHash,
      nickname || `玩家${Date.now()}`,
      guardian_type,
      personalInviteCode,
      inviterId,
      x,
      y
    ]
  );
  
  const userId = insertResult.rows[0].id;
  
  // 记录邀请关系
  await dbPool.query(
    'INSERT INTO invite_records (inviter_id, invitee_id) VALUES ($1, $2)',
    [inviterId, userId]
  );
  
  // 生成JWT Token
  const payload: JWTPayload = {
    userId,
    phone,
    role: 'player'
  };
  
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  logger.info('用户注册成功', { userId, phone, inviterId });

  // 发送Agent欢迎语（异步，不阻塞注册响应）
  setImmediate(async () => {
    try {
      await triggerWelcome(userId);
    } catch (err: any) {
      logger.error('发送Agent欢迎语失败', { userId, error: err.message });
    }
  });

  return {
    token,
    refresh_token: refreshToken,
    user_id: userId,
    territory_coord_x: x,
    territory_coord_y: y
  };
};

/**
 * 用户登录
 */
export const login = async (params: LoginParams): Promise<AuthResult> => {
  const { phone, password } = params;
  
  // 查询用户
  const result: any = await dbPool.query(
    'SELECT id, phone, password_hash, role, territory_coord_x, territory_coord_y, status FROM users WHERE phone = $1',
    [phone]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = rows[0];
  
  // 检查账号状态
  if (user.status === 'frozen') {
    throw new Error('账号已被冻结');
  }
  
  if (user.status === 'deleted') {
    throw new Error('账号已被注销');
  }
  
  // 验证密码
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('密码错误');
  }
  
  // 更新最后登录时间
  await dbPool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );
  
  // 生成JWT Token
  const payload: JWTPayload = {
    userId: user.id,
    phone: user.phone,
    role: user.role
  };
  
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  logger.info('用户登录成功', { userId: user.id, phone });
  
  return {
    token,
    refresh_token: refreshToken,
    user_id: user.id,
    territory_coord_x: user.territory_coord_x,
    territory_coord_y: user.territory_coord_y
  };
};

/**
 * 刷新Token
 */
export const refreshToken = async (refresh_Token: string): Promise<{ token: string; refresh_token: string }> => {
  // 验证refresh token
  const payload = verifyToken(refresh_Token);
  if (!payload) {
    throw new Error('Refresh Token无效或已过期');
  }
  
  // 生成新的Token
  const newToken = generateToken(payload);
  const newRefreshToken = generateRefreshToken(payload);
  
  return {
    token: newToken,
    refresh_token: newRefreshToken
  };
};

/**
 * 手机号验证码注册
 */
export const registerByPhone = async (params: RegisterByPhoneParams): Promise<AuthResult> => {
  const { phone, sms_code, invite_code, guardian_type, nickname, device_id } = params;

  // 检查同一设备是否已注册
  if (device_id) {
    const deviceResult: any = await dbPool!.query(
      'SELECT id FROM users WHERE device_id = $1 AND status != \'deleted\'',
      [device_id]
    );
    if (deviceResult.rows.length > 0) {
      throw new Error('该设备已注册账号，不可重复注册');
    }
  }

  // 验证短信验证码
  const smsValid = await verifySmsCode(phone, sms_code, 'register');
  if (!smsValid) {
    throw new Error('验证码错误或已过期');
  }
  
  // 检查手机号是否已注册
  const existingResult: any = await dbPool!.query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );
  
  if (existingResult.rows.length > 0) {
    throw new Error('手机号已注册，请直接登录');
  }
  
  // 验证邀请码
  const inviterId = await validateInviteCode(invite_code);
  if (!inviterId) {
    throw new Error('邀请码无效或已过期');
  }
  
  // 生成个人邀请码
  const personalInviteCode = await generateInviteCode();
  
  // 分配领地坐标
  const { x, y } = await allocateTerritoryCoord(inviterId);
  
  // 插入用户记录（验证码注册不需要密码）
  const insertResult: any = await dbPool!.query(
    `INSERT INTO users (
      phone, password_hash, nickname, guardian_type, 
      invite_code, invited_by, 
      territory_coord_x, territory_coord_y, device_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      phone,
      '', // 验证码登录用户无密码
      nickname || `玩家${Date.now()}`,
      guardian_type,
      personalInviteCode,
      inviterId,
      x,
      y,
      device_id || null
    ]
  );
  
  const userId = insertResult.rows[0].id;
  
  // 记录邀请关系
  await dbPool!.query(
    'INSERT INTO invite_records (inviter_id, invitee_id) VALUES ($1, $2)',
    [inviterId, userId]
  );
  
  // 绑定 device_id 到访问记录
  if (device_id) {
    await dbPool!.query(
      `INSERT INTO device_visits (device_id, user_id, registered_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (device_id) 
       DO UPDATE SET user_id = $2, registered_at = NOW()`,
      [device_id, userId]
    );
  }
  
  // 生成JWT Token
  const payload: JWTPayload = {
    userId,
    phone,
    role: 'player'
  };
  
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  logger.info('用户验证码注册成功', { userId, phone, inviterId, device_id });

  // 发送Agent欢迎语（异步，不阻塞注册响应）
  setImmediate(async () => {
    try {
      await triggerWelcome(userId);
    } catch (err: any) {
      logger.error('发送Agent欢迎语失败', { userId, error: err.message });
    }
  });

  return {
    token,
    refresh_token: refreshToken,
    user_id: userId,
    territory_coord_x: x,
    territory_coord_y: y
  };
};

/**
 * 手机号验证码登录
 */
export const loginByPhone = async (params: LoginByPhoneParams): Promise<AuthResult> => {
  const { phone, sms_code, device_id } = params;
  
  // 验证短信验证码
  const smsValid = await verifySmsCode(phone, sms_code, 'login');
  if (!smsValid) {
    throw new Error('验证码错误或已过期');
  }
  
  // 查询用户
  const result: any = await dbPool!.query(
    'SELECT id, phone, role, territory_coord_x, territory_coord_y, status FROM users WHERE phone = $1',
    [phone]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在，请先注册');
  }
  
  const user = rows[0];
  
  // 检查账号状态
  if (user.status === 'frozen') {
    throw new Error('账号已被冻结');
  }
  
  if (user.status === 'deleted') {
    throw new Error('账号已被注销');
  }
  
  // 更新最后登录时间
  await dbPool!.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );
  
  // 绑定 device_id
  if (device_id) {
    await dbPool!.query(
      'UPDATE users SET device_id = $1 WHERE id = $2',
      [device_id, user.id]
    );
  }
  
  // 生成JWT Token
  const payload: JWTPayload = {
    userId: user.id,
    phone: user.phone,
    role: user.role
  };
  
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  logger.info('用户验证码登录成功', { userId: user.id, phone, device_id });
  
  return {
    token,
    refresh_token: refreshToken,
    user_id: user.id,
    territory_coord_x: user.territory_coord_x,
    territory_coord_y: user.territory_coord_y
  };
};

/**
 * 合并游客数据到用户
 */
export const mergeGuestData = async (deviceId: string, userId: number): Promise<void> => {
  try {
    // 异步执行，不阻塞注册响应
    setImmediate(async () => {
      // 更新 action_logs
      await dbPool!.query(
        'UPDATE action_logs SET user_id = $1 WHERE device_id = $2 AND user_id IS NULL',
        [userId, deviceId]
      );
      
      // 更新 device_visits
      await dbPool!.query(
        'UPDATE device_visits SET user_id = $1, registered_at = NOW() WHERE device_id = $2',
        [userId, deviceId]
      );
      
      logger.info('游客数据合并完成', { deviceId, userId });
    });
  } catch (error) {
    logger.error('游客数据合并失败', { deviceId, userId, error });
  }
};

/**
 * 修改密码
 */
export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  // 查询用户
  const result: any = await dbPool!.query(
    'SELECT password_hash FROM users WHERE id = $1 AND status = \'active\'',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在或已被冻结');
  }

  const user = result.rows[0];

  // 验证旧密码（验证码注册用户无密码时跳过）
  if (user.password_hash) {
    const isOldValid = await comparePassword(oldPassword, user.password_hash);
    if (!isOldValid) {
      throw new Error('原密码错误');
    }
  }

  // 验证新密码强度
  if (!validatePasswordStrength(newPassword)) {
    throw new Error('密码需至少8位，包含大小写字母和数字');
  }

  // 更新密码
  const newHash = await hashPassword(newPassword);
  await dbPool!.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newHash, userId]
  );

  logger.info('用户修改密码成功', { userId });
};

/**
 * 重置密码（通过短信验证码）
 */
export const resetPassword = async (
  phone: string,
  smsCode: string,
  newPassword: string
): Promise<void> => {
  // 验证短信验证码
  const smsValid = await verifySmsCode(phone, smsCode, 'reset_pwd');
  if (!smsValid) {
    throw new Error('验证码错误或已过期');
  }

  // 验证新密码强度
  if (!validatePasswordStrength(newPassword)) {
    throw new Error('密码需至少8位，包含大小写字母和数字');
  }

  // 查询用户
  const result: any = await dbPool!.query(
    'SELECT id FROM users WHERE phone = $1 AND status = \'active\'',
    [phone]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在或已被冻结');
  }

  // 更新密码
  const newHash = await hashPassword(newPassword);
  await dbPool!.query(
    'UPDATE users SET password_hash = $1 WHERE phone = $2',
    [newHash, phone]
  );

  logger.info('用户重置密码成功', { phone });
};

/**
 * 注销账号
 * 标记为 deleted 状态，30天后由定时任务彻底删除数据
 */
export const deleteAccount = async (
  userId: number,
  password: string
): Promise<void> => {
  // 查询用户
  const result: any = await dbPool!.query(
    'SELECT password_hash FROM users WHERE id = $1 AND status = \'active\'',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在或已被冻结');
  }

  const user = result.rows[0];

  // 验证密码（验证码注册用户无密码时跳过）
  if (user.password_hash) {
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }
  }

  // 标记为已注销
  await dbPool!.query(
    `UPDATE users SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [userId]
  );

  logger.info('用户注销账号', { userId });
};

/**
 * 定时任务：彻底删除已注销超过30天的用户数据
 */
export const startAccountCleanupScheduler = (): void => {
  console.log('🗑️ 账号清理定时任务启动...');

  const cleanupDeletedAccounts = async () => {
    try {
      // 查找已注销超过30天的用户
      const result: any = await dbPool!.query(
        `SELECT id FROM users
         WHERE status = 'deleted'
           AND updated_at <= NOW() - INTERVAL '30 days'`,
        []
      );

      const users = result.rows;
      console.log(`🗑️ 发现 ${users.length} 个待彻底删除的已注销账号`);

      for (const user of users) {
        // 删除关联数据（外键CASCADE会自动处理大部分）
        await dbPool!.query('DELETE FROM users WHERE id = $1', [user.id]);
        logger.info('已彻底删除用户数据', { userId: user.id });
      }
    } catch (error: any) {
      logger.error('账号清理失败', { error: error.message });
    }
  };

  // 每天执行一次
  setInterval(() => cleanupDeletedAccounts(), 24 * 60 * 60 * 1000);

  console.log('✅ 账号清理定时任务已启动');
};
