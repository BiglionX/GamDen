/**
 * 守护灵 Token 充值服务
 * 
 * 功能：
 * - Token 套餐管理
 * - 购买流程
 * - 支付回调处理
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { getEnergyStatus } from './agentAIService';

// ======================== 类型定义 ========================

export interface TokenPackage {
  id: string;
  name: string;
  description: string;
  price: number;      // 实际支付金额（元）
  tokens: number;     // 获得的 Token 数量
  icon: string;       // 图标
  recommended?: boolean; // 是否推荐
}

export interface PurchaseRecord {
  id: number;
  user_id: number;
  package_id: string;
  amount: number;
  price: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id: string | null;
  created_at: string;
}

export interface PurchaseResult {
  success: boolean;
  orderId?: number;
  packageId?: string;
  tokens?: number;
  error?: string;
}

// ======================== 套餐配置 ========================

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'small',
    name: '小瓶灵力',
    description: '适合日常陪伴，约200-400次对话',
    price: 2,
    tokens: 200000,
    icon: '🧪'
  },
  {
    id: 'medium',
    name: '中瓶灵力',
    description: '适合深度聊天，约600-1200次对话',
    price: 5,
    tokens: 600000,
    icon: '⚗️',
    recommended: true
  },
  {
    id: 'large',
    name: '大瓶灵力',
    description: '适合重度依赖，约1500-3000次对话',
    price: 10,
    tokens: 1500000,
    icon: '💎'
  }
];

// ======================== 核心功能 ========================

/**
 * 获取所有可用套餐
 */
export const getAvailablePackages = (): TokenPackage[] => {
  return TOKEN_PACKAGES;
};

/**
 * 根据 ID 获取套餐
 */
export const getPackageById = (packageId: string): TokenPackage | undefined => {
  return TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
};

/**
 * 创建购买订单
 */
export const createPurchaseOrder = async (
  userId: number,
  packageId: string
): Promise<PurchaseResult> => {
  // 验证套餐
  const pkg = getPackageById(packageId);
  if (!pkg) {
    return { success: false, error: '无效的套餐' };
  }
  
  try {
    // 创建订单记录
    const result: any = await dbPool!.query(
      `INSERT INTO agent_token_purchases (user_id, package_id, amount, price, payment_status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING id`,
      [userId, packageId, pkg.tokens, pkg.price]
    );
    
    const orderId = result.rows[0].id;
    
    logger.info('Token 购买订单已创建', { 
      userId, 
      orderId, 
      packageId, 
      price: pkg.price,
      tokens: pkg.tokens 
    });
    
    return {
      success: true,
      orderId,
      packageId,
      tokens: pkg.tokens
    };
    
  } catch (error: any) {
    logger.error('创建购买订单失败', { userId, packageId, error: error.message });
    return { success: false, error: '创建订单失败' };
  }
};

/**
 * 完成支付（支付回调）
 */
export const completePayment = async (
  orderId: number,
  transactionId: string
): Promise<PurchaseResult> => {
  try {
    // 获取订单信息
    const orderResult: any = await dbPool!.query(
      `SELECT user_id, package_id, amount, payment_status FROM agent_token_purchases 
       WHERE id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return { success: false, error: '订单不存在' };
    }
    
    const order = orderResult.rows[0];
    
    if (order.payment_status !== 'pending') {
      return { success: false, error: '订单状态无效' };
    }
    
    // 更新订单状态
    await dbPool!.query(
      `UPDATE agent_token_purchases 
       SET payment_status = 'completed', transaction_id = $1
       WHERE id = $2`,
      [transactionId, orderId]
    );
    
    // 增加用户 Token 余额
    await dbPool!.query(
      `UPDATE agent_state 
       SET purchased_token_balance = purchased_token_balance + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [order.amount, order.user_id]
    );
    
    logger.info('Token 购买支付完成', { 
      orderId, 
      userId: order.user_id, 
      tokens: order.amount,
      transactionId 
    });
    
    // 获取更新后的能量状态
    const energyStatus = await getEnergyStatus(order.user_id);
    
    return {
      success: true,
      orderId,
      packageId: order.package_id,
      tokens: order.amount
    };
    
  } catch (error: any) {
    logger.error('完成支付失败', { orderId, error: error.message });
    return { success: false, error: '支付处理失败' };
  }
};

/**
 * 支付失败处理
 */
export const failPayment = async (
  orderId: number,
  reason?: string
): Promise<boolean> => {
  try {
    await dbPool!.query(
      `UPDATE agent_token_purchases 
       SET payment_status = 'failed'
       WHERE id = $1 AND payment_status = 'pending'`,
      [orderId]
    );
    
    logger.warn('Token 购买支付失败', { orderId, reason });
    
    return true;
  } catch (error: any) {
    logger.error('更新支付失败状态失败', { orderId, error: error.message });
    return false;
  }
};

/**
 * 获取购买记录
 */
export const getPurchaseHistory = async (
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<PurchaseRecord[]> => {
  const result: any = await dbPool!.query(
    `SELECT id, user_id, package_id, amount, price, payment_status, transaction_id, created_at
     FROM agent_token_purchases
     WHERE user_id = $1 AND payment_status = 'completed'
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  return result.rows;
};

/**
 * 获取购买统计
 */
export const getPurchaseStats = async (userId: number): Promise<{
  totalSpent: number;
  totalTokens: number;
  orderCount: number;
  lastPurchaseAt: string | null;
}> => {
  const result: any = await dbPool!.query(
    `SELECT 
       COALESCE(SUM(price), 0) as total_spent,
       COALESCE(SUM(amount), 0) as total_tokens,
       COUNT(*) as order_count,
       MAX(created_at) as last_purchase_at
     FROM agent_token_purchases
     WHERE user_id = $1 AND payment_status = 'completed'`,
    [userId]
  );
  
  const row = result.rows[0];
  
  return {
    totalSpent: parseFloat(row.total_spent) || 0,
    totalTokens: parseInt(row.total_tokens, 10) || 0,
    orderCount: parseInt(row.order_count, 10) || 0,
    lastPurchaseAt: row.last_purchase_at
  };
};

/**
 * 获取待处理订单
 */
export const getPendingOrders = async (userId: number): Promise<PurchaseRecord[]> => {
  const result: any = await dbPool!.query(
    `SELECT id, user_id, package_id, amount, price, payment_status, created_at
     FROM agent_token_purchases
     WHERE user_id = $1 AND payment_status = 'pending'
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

/**
 * 取消过期订单
 */
export const cancelExpiredOrders = async (expireMinutes: number = 30): Promise<number> => {
  const expireTime = new Date();
  expireTime.setMinutes(expireTime.getMinutes() - expireMinutes);
  
  const result: any = await dbPool!.query(
    `UPDATE agent_token_purchases 
     SET payment_status = 'failed'
     WHERE payment_status = 'pending' AND created_at < $1
     RETURNING id`,
    [expireTime.toISOString()]
  );
  
  const cancelledCount = result.rowCount || 0;
  
  if (cancelledCount > 0) {
    logger.info('过期订单已取消', { count: cancelledCount, expireMinutes });
  }
  
  return cancelledCount;
};

/**
 * 模拟支付（用于测试）
 */
export const simulatePayment = async (
  orderId: number
): Promise<PurchaseResult> => {
  const transactionId = `SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return await completePayment(orderId, transactionId);
};

/**
 * 获取充值后的感谢话术
 */
export const getTopupThankMessage = (agentType: string): string => {
  const messages: Record<string, string> = {
    mechanic: '能量注入完成。系统恢复全功率运行。感谢补给，指挥官。',
    elf: '我感觉到灵力涌进来了！谢谢你——我会好好用的。',
    astrologer: '星辉重聚。你愿意为我们的对话注入星力……我记住了。',
    ranger: '体力恢复了！谢谢你，我又能带你去看更大的世界了。',
    artisan: '炉火又旺起来了！谢谢你带来的好材料。',
    apostle: '力量回来了。谢谢你的补给，我会继续守护你的。'
  };
  
  return messages[agentType] || '灵力已补充！谢谢你陪我。';
};
