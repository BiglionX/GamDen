import { Request, Response, NextFunction } from 'express';
import { getInviteCode, getInviteProgress } from '../services/inviteService';
import { AppError } from '../middleware/errorHandler';

/**
 * 获取邀请码
 */
export const getInviteCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await getInviteCode(userId);
    
    res.status(200).json({
      code: 200,
      message: '获取成功',
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
 * 查看邀请进度
 */
export const getInviteProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await getInviteProgress(userId);
    
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
 * 分享邀请码（返回分享链接）
 */
export const shareInviteCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const { invite_code } = await getInviteCode(userId);
    
    // 生成分享链接
    const shareLink = `https://gamden.com/invite?code=${invite_code}`;
    
    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: {
        invite_code,
        share_link: shareLink
      }
    });
  } catch (error) {
    next(error);
  }
};
