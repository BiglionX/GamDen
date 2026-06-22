import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

export interface InviteProgress {
  invited_count: number;
  total_count: number;
  is_mini_program_unlocked: boolean;
  invite_list: Array<{
    invitee_id: number;
    invitee_nickname: string;
    invited_at: string;
    is_active: boolean;
  }>;
}

/**
 * 生成邀请码（获取个人邀请码）
 */
export const getInviteCode = async (userId: number): Promise<{ invite_code: string }> => {
  const [rows]: any = await dbPool.execute(
    'SELECT invite_code, status FROM users WHERE id = ?',
    [userId]
  );
  
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  return {
    invite_code: rows[0].invite_code
  };
};

/**
 * 查看邀请进度
 */
export const getInviteProgress = async (userId: number): Promise<InviteProgress> => {
  // 获取邀请记录
  const [records]: any = await dbPool.execute(
    `SELECT 
      ir.invitee_id, ir.invited_at, ir.is_active,
      u.nickname as invitee_nickname
    FROM invite_records ir
    LEFT JOIN users u ON ir.invitee_id = u.id
    WHERE ir.inviter_id = ?
    ORDER BY ir.invited_at DESC
    LIMIT 10`,
    [userId]
  );
  
  // 统计活跃邀请数
  const [countRows]: any = await dbPool.execute(
    'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = ? AND is_active = true',
    [userId]
  );
  
  const invitedCount = countRows[0].count;
  const isUnlocked = invitedCount >= 3;
  
  // 检查是否已生成小程序
  const [miniProgRows]: any = await dbPool.execute(
    'SELECT id FROM mini_programs WHERE user_id = ?',
    [userId]
  );
  
  const isMiniProgramUnlocked = isUnlocked && miniProgRows.length > 0;
  
  const inviteList = records.map((record: any) => ({
    invitee_id: record.invitee_id,
    invitee_nickname: record.invitee_nickname || '未知用户',
    invited_at: record.invited_at,
    is_active: record.is_active
  }));
  
  return {
    invited_count: invitedCount,
    total_count: 10, // 展示用
    is_mini_program_unlocked: isMiniProgramUnlocked,
    invite_list: inviteList
  };
};

/**
 * 激活邀请记录（被邀请人活跃7天后调用）
 */
export const activateInviteRecord = async (inviteeId: number): Promise<void> => {
  await dbPool.execute(
    'UPDATE invite_records SET is_active = true WHERE invitee_id = ?',
    [inviteeId]
  );
  
  // 获取邀请人ID
  const [rows]: any = await dbPool.execute(
    'SELECT inviter_id FROM invite_records WHERE invitee_id = ?',
    [inviteeId]
  );
  
  if (rows.length > 0) {
    const inviterId = rows[0].inviter_id;
    
    // 检查邀请人是否已解锁小程序
    const progress = await getInviteProgress(inviterId);
    
    if (progress.invited_count >= 3 && !progress.is_mini_program_unlocked) {
      // 触发生成小程序（异步任务）
      logger.info('邀请人已满足解锁条件', { inviterId, invitedCount: progress.invited_count });
      // TODO: 调用微信小程序API生成小程序码
    }
  }
};

/**
 * 验证邀请码是否有效
 */
export const validateInviteCodeService = async (
  inviteCode: string
): Promise<{ valid: boolean; inviter_id?: number }> => {
  const [rows]: any = await dbPool.execute(
    'SELECT id FROM users WHERE invite_code = ? AND status = "active"',
    [inviteCode]
  );
  
  if (rows.length === 0) {
    return { valid: false };
  }
  
  return {
    valid: true,
    inviter_id: rows[0].id
  };
};
