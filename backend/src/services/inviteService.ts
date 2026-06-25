import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { autoGenerateMiniProgram } from './wechatService';
import { sendAgentMessage } from './agentService';
import { addExp, addBond } from './agentUpgradeService';

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

    // 触发守护灵升级系统：邀请成功增加EXP和Bond（异步）
    setImmediate(async () => {
      try {
        await addExp(inviterId, 'invite');
        await addBond(inviterId, 'invite');
        logger.info('守护灵邀请EXP和Bond添加成功', { inviterId });
      } catch (err: any) {
        logger.error('守护灵邀请EXP添加失败', { inviterId, error: err.message });
      }
    });
  }
};

/**
 * 定时任务：激活被邀请人活跃记录
 * 每天检查被邀请人注册满7天且活跃的记录，将 is_active 设为 true
 * 激活后通知邀请人并检查是否解锁小程序
 */
export const startInviteActivationScheduler = (): void => {
  console.log('📋 邀请活跃检查定时任务启动...');

  // 每天凌晨3点执行
  const checkActivation = async () => {
    try {
      // 查找注册满7天且尚未激活的邀请记录
      const result: any = await dbPool.query(
        `SELECT ir.invitee_id, ir.inviter_id, u.created_at, u.last_login_at
         FROM invite_records ir
         JOIN users u ON ir.invitee_id = u.id
         WHERE ir.is_active = false
           AND u.status = 'active'
           AND u.created_at <= NOW() - INTERVAL '7 days'
           AND u.last_login_at IS NOT NULL`,
        []
      );

      const records = result.rows;
      console.log(`📋 发现 ${records.length} 条待激活的邀请记录`);

      for (const record of records) {
        // 激活邀请记录
        await dbPool.query(
          'UPDATE invite_records SET is_active = true WHERE invitee_id = $1',
          [record.invitee_id]
        );

        logger.info('邀请记录已激活', {
          inviterId: record.inviter_id,
          inviteeId: record.invitee_id
        });

        // 通知邀请人（Agent话术：邀请成功）
        try {
          await sendAgentMessage(record.inviter_id, 'invite_success');
        } catch (err: any) {
          logger.error('发送邀请成功Agent消息失败', { error: err.message });
        }

        // 检查是否解锁小程序
        const progress = await getInviteProgress(record.inviter_id);
        if (progress.invited_count >= 3 && !progress.is_mini_program_unlocked) {
          logger.info('邀请人已满足解锁条件，开始生成小程序', {
            inviterId: record.inviter_id,
            invitedCount: progress.invited_count
          });
          try {
            await autoGenerateMiniProgram(record.inviter_id);
          } catch (err: any) {
            logger.error('自动生成小程序失败', { error: err.message });
          }
        }
      }
    } catch (error: any) {
      logger.error('邀请活跃检查失败', { error: error.message });
    }
  };

  // 启动时延迟执行一次（等待30秒让数据库就绪）
  setTimeout(() => checkActivation(), 30000);

  // 每天执行一次
  setInterval(() => checkActivation(), 24 * 60 * 60 * 1000);

  console.log('✅ 邀请活跃检查定时任务已启动');
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
