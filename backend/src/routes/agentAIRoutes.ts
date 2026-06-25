/**
 * 守护灵 AI 对话 API 路由
 * 
 * 路由前缀: /api/agent
 * 
 * 接口列表：
 * - POST /chat           - 发送 AI 对话消息
 * - GET  /energy         - 获取能量状态
 * - POST /topup          - 购买 Token 套餐
 * - GET  /topup/packages - 获取可用套餐
 * - POST /topup/callback - 支付回调
 * - GET  /memories       - 获取记忆列表
 * - GET  /conversations  - 获取对话历史
 * - DELETE /history      - 清空对话历史
 * - GET  /stats          - 获取对话统计
 */

import { Router, Request, Response, NextFunction } from 'express';
import { 
  sendAgentChat, 
  getEnergyStatus, 
  getChatHistory, 
  getChatStats 
} from '../services/agentAIService';
import { 
  getLongTermMemories, 
  getMemoryStats, 
  clearConversationHistory,
  getConversations 
} from '../services/agentMemoryService';
import { 
  getAvailablePackages, 
  createPurchaseOrder, 
  completePayment,
  getPurchaseHistory,
  getPurchaseStats,
  simulatePayment,
  getTopupThankMessage,
  TOKEN_PACKAGES 
} from '../services/agentTopupService';
import { AppError } from '../middleware/errorHandler';
import { dbPool } from '../config/database';

const router = Router();

// 所有路由都需要认证
const authMiddleware = require('../middleware/authMiddleware');
router.use(authMiddleware);

// ======================== AI 对话接口 ========================

/**
 * @route   POST /api/agent/chat
 * @desc    发送 AI 对话消息
 * @access  Private
 * @body    { message: string }
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { message } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('消息内容不能为空', 400, 400);
    }

    // 限制消息长度
    const trimmedMessage = message.trim().slice(0, 1000);

    const result = await sendAgentChat(userId, trimmedMessage);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        text: result.text,
        tokensUsed: result.tokensUsed,
        isDegraded: result.isDegraded,
        degradedReason: result.degradedReason,
        remainingToken: result.remainingToken
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/energy
 * @desc    获取能量状态
 * @access  Private
 */
router.get('/energy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const status = await getEnergyStatus(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        dailyUsed: status.dailyUsed,
        dailyFree: status.dailyFree,
        purchasedBalance: status.purchasedBalance,
        remaining: status.remaining,
        total: status.total,
        percentage: Math.round(status.percentage * 100),
        level: status.level,
        lastResetAt: status.lastResetAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// ======================== 充值接口 ========================

/**
 * @route   GET /api/agent/topup/packages
 * @desc    获取可用充值套餐
 * @access  Private
 */
router.get('/topup/packages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = getAvailablePackages();

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        packages
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/topup
 * @desc    创建充值订单
 * @access  Private
 * @body    { packageId: string }
 */
router.post('/topup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { packageId } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!packageId) {
      throw new AppError('请选择充值套餐', 400, 400);
    }

    const result = await createPurchaseOrder(userId, packageId);

    if (!result.success) {
      throw new AppError(result.error || '创建订单失败', 400, 400);
    }

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        orderId: result.orderId,
        packageId: result.packageId,
        tokens: result.tokens,
        // TODO: 返回微信支付参数
        paymentParams: null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/topup/callback
 * @desc    支付回调（模拟）
 * @access  Private
 * @body    { orderId: number, transactionId?: string }
 */
router.post('/topup/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { orderId, transactionId, simulate } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!orderId) {
      throw new AppError('订单ID不能为空', 400, 400);
    }

    let result;

    // 模拟支付（用于测试）
    if (simulate) {
      result = await simulatePayment(orderId);
    } else {
      const txId = transactionId || `WX_${Date.now()}`;
      result = await completePayment(orderId, txId);
    }

    if (!result.success) {
      throw new AppError(result.error || '支付处理失败', 400, 400);
    }

    // 获取守护灵类型和感谢话术
    const guardianResult: any = await dbPool!.query(
      'SELECT guardian_type FROM users WHERE id = $1',
      [userId]
    );
    const guardianType = guardianResult.rows[0]?.guardian_type || 'mechanic';
    const thankMessage = getTopupThankMessage(guardianType);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        orderId: result.orderId,
        tokens: result.tokens,
        thankMessage
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/topup/history
 * @desc    获取充值历史
 * @access  Private
 */
router.get('/topup/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const history = await getPurchaseHistory(userId, limit, offset);
    const stats = await getPurchaseStats(userId);

    // 添加套餐信息
    const historyWithPackages = history.map(record => {
      const pkg = TOKEN_PACKAGES.find(p => p.id === record.package_id);
      return {
        ...record,
        packageName: pkg?.name || record.package_id,
        packageIcon: pkg?.icon || '🧪'
      };
    });

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        history: historyWithPackages,
        stats: {
          totalSpent: stats.totalSpent,
          totalTokens: stats.totalTokens,
          orderCount: stats.orderCount,
          lastPurchaseAt: stats.lastPurchaseAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ======================== 记忆接口 ========================

/**
 * @route   GET /api/agent/memories
 * @desc    获取记忆列表
 * @access  Private
 */
router.get('/memories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const memories = await getLongTermMemories(userId, limit, type);
    const stats = await getMemoryStats(userId);

    // 记忆类型中文映射
    const typeNames: Record<string, string> = {
      game_preference: '游戏偏好',
      emotion: '情感状态',
      habit: '生活习惯',
      relationship: '关系变化',
      other: '其他'
    };

    const memoriesWithLabels = memories.map(m => ({
      ...m,
      typeName: typeNames[m.memory_type] || m.memory_type
    }));

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        memories: memoriesWithLabels,
        total: stats.total,
        byType: {
          total: stats.total,
          game_preference: stats.byType.game_preference || 0,
          emotion: stats.byType.emotion || 0,
          habit: stats.byType.habit || 0,
          relationship: stats.byType.relationship || 0,
          other: stats.byType.other || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ======================== 对话历史接口 ========================

/**
 * @route   GET /api/agent/conversations
 * @desc    获取对话历史
 * @access  Private
 */
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const { conversations, isDegraded, energyLevel } = await getChatHistory(userId, limit);
    const stats = await getChatStats(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        conversations,
        isDegraded,
        energyLevel,
        stats: {
          todayTokens: stats.todayTokens,
          todayRequests: stats.todayRequests,
          totalConversations: stats.totalConversations
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/agent/history
 * @desc    清空对话历史
 * @access  Private
 */
router.delete('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const deletedCount = await clearConversationHistory(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/stats
 * @desc    获取对话统计
 * @access  Private
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const stats = await getChatStats(userId);
    const memoryStats = await getMemoryStats(userId);
    const purchaseStats = await getPurchaseStats(userId);
    const energy = await getEnergyStatus(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        chat: {
          todayTokens: stats.todayTokens,
          todayRequests: stats.todayRequests,
          totalConversations: stats.totalConversations
        },
        memory: {
          total: memoryStats.total,
          byType: memoryStats.byType
        },
        purchase: {
          totalSpent: purchaseStats.totalSpent,
          totalTokens: purchaseStats.totalTokens,
          orderCount: purchaseStats.orderCount
        },
        energy: {
          remaining: energy.remaining,
          level: energy.level,
          purchasedBalance: energy.purchasedBalance
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
