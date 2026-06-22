import { dbPool } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, JWTPayload } from '../utils/jwt';
import { logger } from '../utils/logger';

export interface RegisterParams {
  phone: string;
  password: string;
  invite_code: string;
  guardian_type: 'mechanic' | 'elf' | 'astrologer';
  nickname?: string;
}

export interface LoginParams {
  phone: string;
  password: string;
}

export interface AuthResult {
  token: string;
  refresh_token: string;
  user_id: number;
  territory_coord_x: number;
  territory_coord_y: number;
}

/**
 * 验证邀请码
 */
const validateInviteCode = async (inviteCode: string): Promise<number | null> => {
  const [rows]: any = await dbPool.execute(
    'SELECT id FROM users WHERE invite_code = ? AND status = "active"',
    [inviteCode]
  );
  
  if (rows.length === 0) {
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
    
    const [rows]: any = await dbPool.execute(
      'SELECT id FROM users WHERE invite_code = ?',
      [code]
    );
    exists = rows.length > 0;
  } while (exists);
  
  return code;
};

/**
 * 分配领地坐标
 */
const allocateTerritoryCoord = async (inviterId: number | null): Promise<{ x: number; y: number }> => {
  // 简化版：随机分配，确保不重复
  // 实际应该使用存储过程或更复杂的算法
  let x: number, y: number;
  let attempts = 0;
  
  do {
    if (inviterId) {
      // 获取邀请人坐标
      const [inviterRows]: any = await dbPool.execute(
        'SELECT territory_coord_x, territory_coord_y FROM users WHERE id = ?',
        [inviterId]
      );
      
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
    const [existingRows]: any = await dbPool.execute(
      'SELECT id FROM users WHERE territory_coord_x = ? AND territory_coord_y = ?',
      [x, y]
    );
    
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
  const { phone, password, invite_code, guardian_type, nickname } = params;
  
  // 检查手机号是否已注册
  const [existingUsers]: any = await dbPool.execute(
    'SELECT id FROM users WHERE phone = ?',
    [phone]
  );
  
  if (existingUsers.length > 0) {
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
  
  // 插入用户记录
  const [result]: any = await dbPool.execute(
    `INSERT INTO users (
      phone, password_hash, nickname, guardian_type, 
      invite_code, invited_by, 
      territory_coord_x, territory_coord_y
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
  
  const userId = result.insertId;
  
  // 记录邀请关系
  await dbPool.execute(
    'INSERT INTO invite_records (inviter_id, invitee_id) VALUES (?, ?)',
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
  const [rows]: any = await dbPool.execute(
    'SELECT id, phone, password_hash, role, territory_coord_x, territory_coord_y, status FROM users WHERE phone = ?',
    [phone]
  );
  
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
  await dbPool.execute(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
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
export const refreshToken = async (refreshToken: string): Promise<{ token: string; refresh_token: string }> => {
  // 验证refresh token
  const payload = verifyToken(refreshToken);
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
