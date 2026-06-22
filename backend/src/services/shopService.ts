import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

export interface GoldTransaction {
  user_id: number;
  transaction_type: 'earn' | 'spend';
  amount: number;
  source: string;
  description?: string;
}

/**
 * 获取用户金币余额
 */
export const getGoldCoins = async (userId: number): Promise<number> => {
  const result: any = await dbPool.query(
    'SELECT gold_coins FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  return rows[0].gold_coins;
};

/**
 * 添加金币
 */
export const addGoldCoins = async (
  userId: number,
  amount: number,
  source: string,
  description?: string
): Promise<{ new_balance: number }> => {
  // 获取当前余额
  const currentBalance = await getGoldCoins(userId);
  let newBalance = currentBalance + amount;
  
  // 检查上限
  if (newBalance > 99999) {
    newBalance = 99999;
  }
  
  // 更新余额
  await dbPool.query(
    'UPDATE users SET gold_coins = $1 WHERE id = $2',
    [newBalance, userId]
  );
  
  // 记录流水
  await dbPool.query(
    `INSERT INTO gold_transactions (user_id, transaction_type, amount, source, balance_after, description)
    VALUES ($1, 'earn', $2, $3, $4, $5)`,
    [userId, amount, source, newBalance, description || '']
  );
  
  logger.info('金币添加成功', { userId, amount, source, newBalance });
  
  return {
    new_balance: newBalance
  };
};

/**
 * 消费金币
 */
export const spendGoldCoins = async (
  userId: number,
  amount: number,
  source: string,
  description?: string
): Promise<{ new_balance: number }> => {
  // 获取当前余额
  const currentBalance = await getGoldCoins(userId);
  
  // 检查余额是否充足
  if (currentBalance < amount) {
    throw new Error('金币不足');
  }
  
  const newBalance = currentBalance - amount;
  
  // 更新余额
  await dbPool.query(
    'UPDATE users SET gold_coins = $1 WHERE id = $2',
    [newBalance, userId]
  );
  
  // 记录流水
  await dbPool.query(
    `INSERT INTO gold_transactions (user_id, transaction_type, amount, source, balance_after, description)
    VALUES ($1, 'spend', $2, $3, $4, $5)`,
    [userId, amount, source, newBalance, description || '']
  );
  
  logger.info('金币消费成功', { userId, amount, source, newBalance });
  
  return {
    new_balance: newBalance
  };
};

/**
 * 兑换头像框
 */
export const exchangeAvatarFrame = async (
  userId: number,
  item_id: string
): Promise<{ success: boolean }> => {
  const price = 200; // 头像框200金币
  
  await spendGoldCoins(userId, price, 'exchange_avatar_frame', `兑换头像框: ${item_id}`);
  
  // TODO: 将头像框添加到用户道具表
  
  return {
    success: true
  };
};

/**
 * 兑换聊天气泡
 */
export const exchangeChatBubble = async (
  userId: number,
  item_id: string
): Promise<{ success: boolean }> => {
  const price = 150; // 聊天气泡150金币
  
  await spendGoldCoins(userId, price, 'exchange_chat_bubble', `兑换聊天气泡: ${item_id}`);
  
  // TODO: 将聊天气泡添加到用户道具表
  
  return {
    success: true
  };
};

/**
 * 兑换特殊签名
 */
export const exchangeSpecialSignature = async (
  userId: number,
  days: number = 30
): Promise<{ success: boolean }> => {
  // 检查用户等级（需要Lv.3以上）
  const result: any = await dbPool.query(
    'SELECT level FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0 || rows[0].level < 3) {
    throw new Error('需要Lv.3以上才能兑换特殊签名');
  }
  
  const price = 300; // 特殊签名300金币30天
  
  await spendGoldCoins(userId, price, 'exchange_special_signature', `兑换特殊签名: ${days}天`);
  
  // TODO: 将特殊签名权限添加到用户表
  
  return {
    success: true
  };
};

/**
 * 获取金币流水记录
 */
export const getGoldTransactions = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ transactions: any[]; total: number }> => {
  const offset = (page - 1) * limit;
  
  const rowsResult: any = await dbPool.query(
    'SELECT * FROM gold_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  
  const countResult: any = await dbPool.query(
    'SELECT COUNT(*) as total FROM gold_transactions WHERE user_id = $1',
    [userId]
  );
  
  return {
    transactions: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};
