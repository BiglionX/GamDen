import { Request, Response, NextFunction } from 'express';
import { getTerritoryInfo, getNearbyNeighbors, updateSignature } from '../services/territoryService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * 获取领地详情
 */
export const getTerritoryInfoController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const territoryInfo = await getTerritoryInfo(userId);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: territoryInfo
    });
  } catch (error: any) {
    if (error.message === '用户不存在或已注销') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 查看周围邻居
 */
export const getNearbyNeighborsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const range = parseInt(req.query.range as string) || 10;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // 限制最大范围
    if (range > 50) {
      throw new AppError('查看范围不能超过50格', 400, 400);
    }
    
    const result = await getNearbyNeighbors(userId, range);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
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
 * 更新签名
 */
export const updateSignatureController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { signature } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!signature && signature !== '') {
      throw new AppError('签名参数缺失', 400, 400);
    }
    
    await updateSignature(userId, signature);
    
    res.status(200).json({
      code: 200,
      message: '签名更新成功'
    });
  } catch (error: any) {
    if (error.message === '签名长度不能超过20字') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取野兽潮状态（占位，V1.0仅展示）
 */
export const getBeastStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // V1.0仅返回静态状态
    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        has_beast_event: false,
        nearby_events: []
      }
    });
  } catch (error) {
    next(error);
  }
};
