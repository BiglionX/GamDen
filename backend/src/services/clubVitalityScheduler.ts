/**
 * 俱乐部活力值定时任务
 * 负责：
 * 1. 每日凌晨处理低活力俱乐部（休眠/归档）
 * 2. 处理过期提议
 * 3. 重置每日活力值计数
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { processExpiredProposals } from './clubService';

let vitalitySchedulerTimer: NodeJS.Timeout | null = null;
let proposalExpiryTimer: NodeJS.Timeout | null = null;

/**
 * 启动活力值定时任务调度器
 */
export const startClubVitalityScheduler = (): void => {
  // 检查是否已启动
  if (vitalitySchedulerTimer) {
    logger.warn('活力值调度器已启动，忽略重复调用');
    return;
  }

  // 立即执行一次（启动时）
  processLowVitalityClubs().catch(err => {
    logger.error('启动时处理低活力俱乐部失败', { error: err.message });
  });

  // 提议过期检查（每小时执行）
  proposalExpiryTimer = setInterval(() => {
    processExpiredProposals().then(count => {
      if (count > 0) {
        logger.info('定时检查过期提议', { processed: count });
      }
    }).catch(err => {
      logger.error('定时检查过期提议失败', { error: err.message });
    });
  }, 60 * 60 * 1000); // 每小时

  // 每日凌晨00:05执行活力值检查
  const msUntilMidnight = getMsUntilTime(0, 5); // 00:05
  vitalitySchedulerTimer = setTimeout(() => {
    // 执行每日检查
    dailyVitalityCheck().catch(err => {
      logger.error('每日活力值检查失败', { error: err.message });
    });

    // 设置每24小时循环
    vitalitySchedulerTimer = setInterval(() => {
      dailyVitalityCheck().catch(err => {
        logger.error('每日活力值检查失败', { error: err.message });
      });
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  logger.info('俱乐部活力值调度器已启动');
};

/**
 * 停止活力值定时任务调度器
 */
export const stopClubVitalityScheduler = (): void => {
  if (vitalitySchedulerTimer) {
    clearInterval(vitalitySchedulerTimer);
    vitalitySchedulerTimer = null;
  }
  if (proposalExpiryTimer) {
    clearInterval(proposalExpiryTimer);
    proposalExpiryTimer = null;
  }
  logger.info('俱乐部活力值调度器已停止');
};

/**
 * 获取距离指定时间的毫秒数
 */
function getMsUntilTime(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  return target.getTime() - now.getTime();
}

/**
 * 每日活力值检查
 */
async function dailyVitalityCheck(): Promise<void> {
  logger.info('开始每日活力值检查');

  try {
    // 1. 处理低活力俱乐部
    const processedCount = await processLowVitalityClubs();
    
    // 2. 重置每日活力值计数（可选，用于限制每日增量）
    // 当前实现中我们使用无限制的活力值累计，所以不需要重置

    logger.info('每日活力值检查完成', { processedClubs: processedCount });
  } catch (error: any) {
    logger.error('每日活力值检查异常', { error: error.message });
  }
}

/**
 * 处理低活力俱乐部
 * 规则：
 * - 连续7天活力值=0：发送提醒给俱乐部掌柜
 * - 连续14天活力值=0：进入"休眠"状态，从列表页隐藏
 * - 连续30天活力值=0：自动归档，提议人可以重新激活
 */
async function processLowVitalityClubs(): Promise<number> {
  const now = new Date();
  let processedCount = 0;
  const pool = dbPool!; // 确保非空

  try {
    // 1. 查找连续14天零活力的俱乐部，设置为休眠
    const dormantClubs: any = await pool.query(`
      SELECT c.id, c.name, c.owner_id, u.nickname as owner_name
      FROM clubs c
      JOIN users u ON c.owner_id = u.id
      WHERE c.status = 'active'
        AND c.club_type != 'default'
        AND c.vitality_updated_at < NOW() - INTERVAL '14 days'
        AND c.vitality = 0
    `);

    for (const club of dormantClubs.rows) {
      await pool.query(
        "UPDATE clubs SET status = 'dormant' WHERE id = $1",
        [club.id]
      );

      // 记录日志（可通过OpenIM发送系统消息给掌柜）
      logger.info('俱乐部进入休眠状态', { 
        clubId: club.id, 
        clubName: club.name, 
        ownerId: club.owner_id 
      });

      processedCount++;
    }

    // 2. 查找连续30天零活力的俱乐部，设置为归档
    const archivedClubs: any = await pool.query(`
      SELECT id, name, owner_id
      FROM clubs
      WHERE status = 'dormant'
        AND vitality_updated_at < NOW() - INTERVAL '30 days'
        AND vitality = 0
    `);

    for (const club of archivedClubs.rows) {
      await pool.query(
        "UPDATE clubs SET status = 'archived' WHERE id = $1",
        [club.id]
      );

      logger.info('俱乐部已归档', { clubId: club.id, clubName: club.name });

      processedCount++;
    }

    // 3. 查找连续7天零活力但未休眠的俱乐部，发送提醒
    const warningClubs: any = await pool.query(`
      SELECT c.id, c.name, c.owner_id, u.nickname as owner_name, u.phone as owner_phone
      FROM clubs c
      JOIN users u ON c.owner_id = u.id
      WHERE c.status = 'active'
        AND c.club_type != 'default'
        AND c.vitality_updated_at < NOW() - INTERVAL '7 days'
        AND c.vitality_updated_at >= NOW() - INTERVAL '14 days'
        AND c.vitality = 0
    `);

    for (const club of warningClubs.rows) {
      // 这里可以发送短信或系统消息提醒掌柜
      // 目前仅记录日志
      logger.info('俱乐部7天零活力提醒', { 
        clubId: club.id, 
        clubName: club.name, 
        ownerName: club.owner_name,
        ownerPhone: club.owner_phone ? '***' + club.owner_phone.slice(-4) : 'N/A'
      });

      processedCount++;
    }

  } catch (error: any) {
    logger.error('处理低活力俱乐部失败', { error: error.message });
    throw error;
  }

  return processedCount;
}

/**
 * 手动触发活力值检查（供管理员使用）
 */
export const manualVitalityCheck = async (): Promise<{
  dormant: number;
  archived: number;
  warnings: number;
}> => {
  const result = await processLowVitalityClubs();
  
  // 获取统计信息
  const stats: any = await dbPool!.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'dormant') as dormant_count,
      COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
      COUNT(*) FILTER (WHERE vitality = 0 AND vitality_updated_at < NOW() - INTERVAL '7 days' AND status = 'active') as warning_count
    FROM clubs
    WHERE club_type != 'default'
  `);

  return {
    dormant: parseInt(stats.rows[0].dormant_count) || 0,
    archived: parseInt(stats.rows[0].archived_count) || 0,
    warnings: parseInt(stats.rows[0].warning_count) || 0
  };
};

/**
 * 重新激活休眠的俱乐部
 */
export const reactivateClub = async (clubId: number): Promise<void> => {
  const club: any = await dbPool!.query(
    'SELECT status FROM clubs WHERE id = $1',
    [clubId]
  );

  if (club.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  if (club.rows[0].status !== 'dormant') {
    throw new Error('只有休眠状态的俱乐部可以重新激活');
  }

  await dbPool!.query(
    "UPDATE clubs SET status = 'active', vitality_updated_at = NOW() WHERE id = $1",
    [clubId]
  );

  logger.info('俱乐部已重新激活', { clubId });
};
