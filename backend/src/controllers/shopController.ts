import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import {
  getGoldCoins,
  addGoldCoins,
  spendGoldCoins,
  exchangeAvatarFrame,
  exchangeChatBubble,
  exchangeSpecialSignature,
  getGoldTransactions,
  getItemList,
  getMyItems
} from '../services/shopService';
import { addExperience } from '../services/territoryService';
import { AppError } from '../middleware/errorHandler';

/**
 * 获取金币余额
 */
export const getGoldCoinsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const balance = await getGoldCoins(userId);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        gold_coins: balance
      }
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 签到（获取金币和经验）
 */
export const signInController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // 检查今天是否已签到（PostgreSQL语法）
    const existingResult: any = await dbPool!.query(
      'SELECT id FROM sign_in_records WHERE user_id = $1 AND DATE(sign_date) = CURRENT_DATE',
      [userId]
    );
    
    if (existingResult.rows.length > 0) {
      throw new Error('今天已经签到过了');
    }
    
    // 获取连续签到天数（PostgreSQL语法）
    const yesterdayResult: any = await dbPool!.query(
      `SELECT continuous_days FROM sign_in_records 
       WHERE user_id = $1 AND DATE(sign_date) = CURRENT_DATE - INTERVAL '1 day'`,
      [userId]
    );
    
    let continuousDays = 1;
    let rewardGold = 10;
    let rewardExp = 10;
    
    if (yesterdayResult.rows.length > 0) {
      continuousDays = yesterdayResult.rows[0].continuous_days + 1;
      // 连续签到额外奖励
      if (continuousDays <= 3) {
        rewardGold += continuousDays * 5;
        rewardExp += continuousDays * 5;
      }
    }
    
    // 插入签到记录（PostgreSQL语法）
    await dbPool!.query(
      `INSERT INTO sign_in_records (user_id, sign_date, continuous_days, reward_gold, reward_exp)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)`,
      [userId, continuousDays, rewardGold, rewardExp]
    );
    
    // 添加金币
    const goldResult = await addGoldCoins(userId, rewardGold, 'sign_in', `签到奖励（连续${continuousDays}天）`);
    
    // 添加经验
    const expResult = await addExperience(userId, rewardExp, 'sign_in');
    
    res.status(200).json({
      code: 200,
      message: '签到成功',
      data: {
        continuous_days: continuousDays,
        reward_gold: rewardGold,
        reward_exp: rewardExp,
        new_balance: goldResult.new_balance,
        level_up: expResult.level_up,
        new_level: expResult.new_level
      }
    });
  } catch (error: any) {
    if (error.message === '今天已经签到过了') {
      next(new AppError(error.message, 400, 1008));
    } else {
      next(error);
    }
  }
};

/**
 * 兑换头像框
 */
export const exchangeAvatarFrameController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { item_id } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!item_id) {
      throw new AppError('道具ID缺失', 400, 400);
    }
    
    const result = await exchangeAvatarFrame(userId, item_id);
    
    res.status(200).json({
      code: 200,
      message: '兑换成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '金币不足') {
      next(new AppError(error.message, 400, 1003));
    } else {
      next(error);
    }
  }
};

/**
 * 兑换聊天气泡
 */
export const exchangeChatBubbleController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { item_id } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!item_id) {
      throw new AppError('道具ID缺失', 400, 400);
    }
    
    const result = await exchangeChatBubble(userId, item_id);
    
    res.status(200).json({
      code: 200,
      message: '兑换成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '金币不足') {
      next(new AppError(error.message, 400, 1003));
    } else {
      next(error);
    }
  }
};

/**
 * 兑换特殊签名
 */
export const exchangeSpecialSignatureController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { days } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await exchangeSpecialSignature(userId, days || 30);
    
    res.status(200).json({
      code: 200,
      message: '兑换成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '金币不足') {
      next(new AppError(error.message, 400, 1003));
    } else if (error.message === '需要Lv.3以上才能兑换特殊签名') {
      next(new AppError(error.message, 403, 403));
    } else {
      next(error);
    }
  }
};

/**
 * 获取金币流水
 */
export const getGoldTransactionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await getGoldTransactions(userId, page, limit);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取道具列表
 */
export const getItemListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const result = await getItemList(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的道具
 */
export const getMyItemsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const result = await getMyItems(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
