/**
 * 守护灵定时任务服务
 * 
 * 功能：
 * - 每日 Token 重置（00:00 UTC+8）
 * - 过期订单清理
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { cancelExpiredOrders } from './agentTopupService';

// ======================== 常量 ========================

const ORDER_EXPIRE_MINUTES = parseInt(process.env.TOKEN_ORDER_EXPIRE_MINUTES || '30', 10);

// ======================== 每日 Token 重置任务 ========================

/**
 * 重置所有用户的每日 Token 使用量
 * 每日 00:00 (UTC+8) 执行
 */
const resetDailyTokens = async (): Promise<number> => {
  try {
    const result: any = await dbPool!.query(
      `UPDATE agent_state 
       SET daily_token_used = 0, last_token_reset_at = NOW()
       WHERE last_token_reset_at IS NULL 
          OR last_token_reset_at < CURRENT_DATE`
    );

    const affectedRows = result.rowCount || 0;
    
    if (affectedRows > 0) {
      logger.info('每日 Token 重置完成', { affectedRows });
    }

    return affectedRows;
  } catch (error: any) {
    logger.error('每日 Token 重置失败', { error: error.message });
    return 0;
  }
};

/**
 * 初始化每日 Token 使用记录
 */
const initDailyTokenRecords = async (): Promise<number> => {
  try {
    const result: any = await dbPool!.query(
      `INSERT INTO agent_daily_token_usage (user_id, usage_date, tokens_used, request_count)
       SELECT user_id, CURRENT_DATE, 0, 0
       FROM agent_state
       WHERE user_id NOT IN (
         SELECT user_id 
         FROM agent_daily_token_usage 
         WHERE usage_date = CURRENT_DATE
       )
       ON CONFLICT (user_id, usage_date) DO NOTHING`
    );

    const insertedRows = result.rowCount || 0;
    
    if (insertedRows > 0) {
      logger.info('每日 Token 使用记录初始化完成', { insertedRows });
    }

    return insertedRows;
  } catch (error: any) {
    logger.error('每日 Token 使用记录初始化失败', { error: error.message });
    return 0;
  }
};

// ======================== 订单清理任务 ========================

/**
 * 清理过期未支付的订单
 */
const cleanupExpiredOrders = async (): Promise<number> => {
  try {
    const cancelledCount = await cancelExpiredOrders(ORDER_EXPIRE_MINUTES);
    return cancelledCount;
  } catch (error: any) {
    logger.error('清理过期订单失败', { error: error.message });
    return 0;
  }
};

// ======================== 任务调度器 ========================

/**
 * 计算距离下一个目标时间的毫秒数
 */
const getMsUntil = (hour: number, minute: number = 0, second: number = 0): number => {
  const now = new Date();
  const target = new Date(now);
  
  // 设置为 UTC+8 时区
  const offset = 8 * 60; // UTC+8
  const localOffset = now.getTimezoneOffset();
  const totalOffset = offset + localOffset;
  
  target.setHours(hour, minute, second, 0);
  
  // 如果已经过了今天的目标时间，则设置为明天
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  
  return target.getTime() - now.getTime();
};

/**
 * 启动每日 Token 重置定时任务
 */
export const startDailyTokenResetScheduler = (): void => {
  logger.info('守护灵每日 Token 重置定时任务启动...');

  const runDailyReset = async () => {
    logger.info('执行每日 Token 重置...');
    
    try {
      const resetCount = await resetDailyTokens();
      const initCount = await initDailyTokenRecords();
      
      logger.info('每日 Token 重置任务完成', {
        resetCount,
        initCount,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('每日 Token 重置任务异常', { error: error.message });
    }
  };

  const scheduleNextRun = () => {
    // 计算距离下一个 00:00 的毫秒数
    const msUntilMidnight = getMsUntil(0, 0, 0);
    
    logger.info(`下次 Token 重置时间: ${new Date(Date.now() + msUntilMidnight).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    setTimeout(() => {
      runDailyReset();
      
      // 之后每 24 小时执行一次
      setInterval(runDailyReset, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  };

  scheduleNextRun();
  logger.info('守护灵每日 Token 重置定时任务已启动');
};

/**
 * 启动订单清理定时任务
 * 每 15 分钟执行一次
 */
export const startOrderCleanupScheduler = (): void => {
  logger.info('守护灵订单清理定时任务启动...');

  const runCleanup = async () => {
    try {
      const cancelledCount = await cleanupExpiredOrders();
      
      if (cancelledCount > 0) {
        logger.info('订单清理任务完成', { cancelledCount });
      }
    } catch (error: any) {
      logger.error('订单清理任务异常', { error: error.message });
    }
  };

  // 每 15 分钟执行一次
  const CLEANUP_INTERVAL = 15 * 60 * 1000;
  
  // 立即执行一次
  runCleanup();
  
  // 之后每 15 分钟执行一次
  setInterval(runCleanup, CLEANUP_INTERVAL);
  
  logger.info(`守护灵订单清理定时任务已启动（每 ${CLEANUP_INTERVAL / 60000} 分钟执行一次）`);
};

/**
 * 启动所有守护灵定时任务
 */
export const startAllAgentSchedulers = (): void => {
  logger.info('启动所有守护灵定时任务...');
  
  startDailyTokenResetScheduler();
  startOrderCleanupScheduler();
  
  logger.info('所有守护灵定时任务已启动');
};
