import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { autoGenerateMiniProgram } from './wechatService';

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
  const result: any = await dbPool.query(
    'SELECT invite_code, status FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  
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
  const recordsResult: any = await dbPool.query(
    `SELECT 
      ir.invitee_id, ir.invited_at, ir.is_active,
      u.nickname as invitee_nickname
    FROM invite_records ir
    LEFT JOIN users u ON ir.invitee_id = u.id
    WHERE ir.inviter_id = $1
    ORDER BY ir.invited_at DESC
    LIMIT 10`,
    [userId]
  );
  
  const records = recordsResult.rows;
  
  // 统计活跃邀请数
  const countResult: any = await dbPool.query(
    'SELECT COUNT(*) as count FROM invite_records WHERE inviter_id = $1 AND is_active = true',
    [userId]
  );
  
  const countRows = countResult.rows;
  const invitedCount = countRows[0].count;
  const isUnlocked = invitedCount >= 3;
  
  // 检查是否已生成小程序
  const miniProgResult: any = await dbPool.query(
    'SELECT id FROM mini_programs WHERE user_id = $1',
    [userId]
  );
  
  const miniProgRows = miniProgResult.rows;
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
  await dbPool.query(
    'UPDATE invite_records SET is_active = true WHERE invitee_id = $1',
    [inviteeId]
  );
  
  // 获取邀请人ID
  const result: any = await dbPool.query(
    'SELECT inviter_id FROM invite_records WHERE invitee_id = $1',
    [inviteeId]
  );
  
  const rows = result.rows;
  
  if (rows.length > 0) {
    const inviterId = rows[0].inviter_id;
    
    // 检查邀请人是否已解锁小程序
    const progress = await getInviteProgress(inviterId);
    
    if (progress.invited_count >= 3 && !progress.is_mini_program_unlocked) {
      // 触发生成小程序（异步任务）
      logger.info('邀请人已满足解锁条件，开始生成小程序', { inviterId, invitedCount: progress.invited_count });
      try {
        await autoGenerateMiniProgram(inviterId);
      } catch (error: any) {
        logger.error('自动生成小程序失败', { inviterId, error: error.message });
      }
    }
  }
};

/**
 * 验证邀请码是否有效
 */
export const validateInviteCodeService = async (
  inviteCode: string
): Promise<{ valid: boolean; inviter_id?: number }> => {
  const result: any = await dbPool.query(
    'SELECT id FROM users WHERE invite_code = $1 AND status = \'active\'',
    [inviteCode]
  );
  
  const rows = result.rows;
  
  if (rows.length === 0) {
    return { valid: false };
  }
  
  return {
    valid: true,
    inviter_id: rows[0].id
  };
};
