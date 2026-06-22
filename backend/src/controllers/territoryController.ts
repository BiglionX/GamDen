import { Request, Response, NextFunction } from 'express';
import { getTerritoryInfo, getNearbyNeighbors, updateSignature } from '../services/territoryService';
import { getBeastStatus } from '../services/beastService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { wrapGuestPayload, wrapUserPayload, maskCoordinate } from '../utils/guestResponse';

/**
 * 获取领地详情
 */
export const getTerritoryInfoController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const identityType = (req as any).identityType;
    const userId = (req as any).user?.userId;
    
    // 游客态：返回需要登录
    if (identityType === 'guest') {
      throw new AppError('需要入巢后才能查看自己的领地', 401, 401);
    }
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const territoryInfo = await getTerritoryInfo(userId);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: wrapUserPayload(territoryInfo)
    });
  } catch (error: any) {
    if (error.message === '用户不存在或已注销') {
      next(new AppError(error.message, 404, 404));
    } else if (error.message === '需要入巢后才能查看自己的领地') {
      next(error);
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
    const identityType = (req as any).identityType;
    const userId = (req as any).user?.userId;
    const range = parseInt(req.query.range as string) || 10;
    
    // 限制最大范围
    if (range > 50) {
      throw new AppError('查看范围不能超过50格', 400, 400);
    }
    
    // 游客态：返回公开邻居列表
    if (identityType === 'guest') {
      const result = await getNearbyNeighbors(1, range); // 使用默认用户 ID 1 作为中心
      
      // 坐标模糊化
      const maskedNeighbors = (result.neighbors || []).map((n: any) => ({
        ...n,
        masked_coord: maskCoordinate(n.territory_coord_x, n.territory_coord_y),
      }));
      
      res.status(200).json({
        code: 200,
        message: 'success',
        data: wrapGuestPayload(maskedNeighbors, { can_greet: false })
      });
      return;
    }
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await getNearbyNeighbors(userId, range);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: wrapUserPayload(result)
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
 * 获取野兽潮状态
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
    
    // 获取真实的野兽潮状态
    const beastStatus = await getBeastStatus(userId);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: beastStatus
    });
  } catch (error) {
    next(error);
  }
};
