/**
 * 守护灵升级系统API路由
 * 
 * 路由前缀: /api/agent
 * 
 * 接口列表：
 * - GET  /state         - 获取守护灵状态
 * - GET  /daily-progress - 获取今日EXP进度
 * - POST /exp           - 触发EXP增加
 * - POST /bond          - 触发亲密度增加
 * - GET  /eggs          - 获取已解锁彩蛋
 * - POST /dialogue      - 用户主动对话
 * - GET  /tags          - 获取性格标签
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getAgentState,
  getDailyProgress,
  addExp,
  addBond,
  getUnlockedEggs,
  getAgentDialogue,
  getPersonalityTags,
  updatePersonalityTags,
  checkAndTriggerEgg,
  type ExpType,
  type BondType,
  type EggType
} from '../services/agentUpgradeService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
const authMiddleware = require('../middleware/authMiddleware');
router.use(authMiddleware);

// ======================== GET 接口 ========================

/**
 * @route   GET /api/agent/state
 * @desc    获取守护灵状态
 * @access  Private
 */
router.get('/state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const state = await getAgentState(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        agentLevel: state.agent_level,
        exp: state.exp,
        bondLevel: state.bond_level,
        bondPoints: state.bond_points,
        personalityTags: state.personality_tags,
        unlockedEggs: state.unlocked_eggs,
        consecutiveDays: state.consecutive_days,
        lastActiveAt: state.last_active_at,
        lastLevelUpAt: state.last_level_up_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/daily-progress
 * @desc    获取今日EXP进度
 * @access  Private
 */
router.get('/daily-progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const progress = await getDailyProgress(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        date: progress.action_date,
        signInCount: progress.sign_in_count,
        postCount: progress.post_count,
        likeCount: progress.like_count,
        inviteCount: progress.invite_count,
        territoryCount: progress.territory_count,
        marketCount: progress.market_count,
        expGained: progress.exp_gained,
        bondGained: progress.bond_gained,
        expRemaining: progress.exp_remaining,
        bondRemaining: progress.bond_remaining,
        // 今日各行为状态
        actions: {
          signIn: { completed: progress.sign_in_count >= 1, max: 1 },
          post: { completed: progress.post_count >= 4, max: 4 },
          like: { completed: progress.like_count >= 5, max: 5 },
          invite: { completed: progress.invite_count >= 3, max: 3 },
          market: { completed: progress.market_count >= 3, max: 3 }
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/eggs
 * @desc    获取已解锁彩蛋列表
 * @access  Private
 */
router.get('/eggs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const eggs = await getUnlockedEggs(userId);

    // 定义所有彩蛋及其状态
    const allEggs = [
      { id: 'daily_fortune', name: '今日运势', desc: '每日首次登录时触发', unlocked: false },
      { id: 'device_status', name: '设备状态', desc: '手机电量≤20%时触发', unlocked: false },
      { id: 'wind_direction', name: '今日风向', desc: '每日首次登录时触发', unlocked: false },
      { id: 'plant', name: '守候草', desc: '连续签到3天时触发', unlocked: false },
      { id: 'framerate', name: '帧率检测', desc: '地图滑动卡顿时触发', unlocked: false },
      { id: 'fate_meet', name: '宿命相遇', desc: '附近有同类守护灵时触发', unlocked: false }
    ];

    const eggsWithStatus = allEggs.map(egg => ({
      ...egg,
      unlocked: eggs.includes(egg.id)
    }));

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        eggs: eggsWithStatus,
        unlockedCount: eggs.length,
        totalCount: allEggs.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/agent/tags
 * @desc    获取性格标签
 * @access  Private
 */
router.get('/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const tags = await getPersonalityTags(userId);

    // 标签名称映射
    const tagNames: Record<string, string> = {
      sharer: '爱分享的机灵鬼',
      social: '社交达人的守护者',
      builder: '工匠精神的共鸣者',
      observer: '沉默的观察者'
    };

    const tagsWithNames = tags.map(tag => ({
      id: tag,
      name: tagNames[tag] || tag
    }));

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        tags: tagsWithNames,
        total: tags.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// ======================== POST 接口 ========================

/**
 * @route   POST /api/agent/exp
 * @desc    触发EXP增加（内部业务调用）
 * @access  Private
 * @body    { type: string, amount?: number }
 */
router.post('/exp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { type, amount } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!type) {
      throw new AppError('type参数缺失', 400, 400);
    }

    const validTypes: ExpType[] = ['sign_in', 'post', 'like', 'invite', 'territory', 'market', 'consecutive'];
    if (!validTypes.includes(type)) {
      throw new AppError('无效的type值', 400, 400);
    }

    const result = await addExp(userId, type, amount);

    res.status(200).json({
      code: 200,
      message: result.success ? 'success' : '已达每日上限',
      data: {
        success: result.success,
        expAdded: result.exp_added,
        newExp: result.new_exp,
        levelUp: result.level_up,
        newLevel: result.new_level,
        unlockedEggs: result.unlocked_eggs,
        text: result.text
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/bond
 * @desc    触发亲密度增加
 * @access  Private
 * @body    { type: string, amount?: number }
 */
router.post('/bond', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { type, amount } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!type) {
      throw new AppError('type参数缺失', 400, 400);
    }

    const validTypes: BondType[] = ['dialogue', 'task', 'consecutive', 'invite', 'level_up'];
    if (!validTypes.includes(type)) {
      throw new AppError('无效的type值', 400, 400);
    }

    const result = await addBond(userId, type, amount);

    res.status(200).json({
      code: 200,
      message: result.success ? 'success' : '已达每日上限',
      data: {
        success: result.success,
        bondAdded: result.bond_added,
        newBond: result.new_bond,
        bondUp: result.bond_up,
        newBondLevel: result.new_bond_level,
        text: result.text
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/dialogue
 * @desc    用户主动对话（V1.0固定回复）
 * @access  Private
 * @body    { type: string }
 */
router.post('/dialogue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { type } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!type) {
      throw new AppError('type参数缺失', 400, 400);
    }

    const validTypes = ['daily_advice', 'story', 'memory'];
    if (!validTypes.includes(type)) {
      throw new AppError('无效的type值', 400, 400);
    }

    const result = await getAgentDialogue(userId, type);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        text: result.text,
        type
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/egg
 * @desc    触发彩蛋检查（通常由客户端特定行为触发）
 * @access  Private
 * @body    { type: string }
 */
router.post('/egg', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { type } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!type) {
      throw new AppError('type参数缺失', 400, 400);
    }

    const validEggs: EggType[] = ['daily_fortune', 'device_status', 'wind_direction', 'fate_meet', 'plant', 'framerate'];
    if (!validEggs.includes(type)) {
      throw new AppError('无效的彩蛋类型', 400, 400);
    }

    const result = await checkAndTriggerEgg(userId, type);

    res.status(200).json({
      code: 200,
      message: result.triggered ? 'success' : '彩蛋未解锁或触发失败',
      data: {
        triggered: result.triggered,
        text: result.text
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/agent/tags/refresh
 * @desc    刷新性格标签
 * @access  Private
 */
router.post('/tags/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const tags = await updatePersonalityTags(userId);

    // 标签名称映射
    const tagNames: Record<string, string> = {
      sharer: '爱分享的机灵鬼',
      social: '社交达人的守护者',
      builder: '工匠精神的共鸣者',
      observer: '沉默的观察者'
    };

    const tagsWithNames = tags.map(tag => ({
      id: tag,
      name: tagNames[tag] || tag
    }));

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        tags: tagsWithNames
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
