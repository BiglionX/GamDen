import { Request, Response, NextFunction } from 'express';
import {
  wechatLogin,
  generateMiniProgramQRCode,
  checkMiniProgramUnlock,
  autoGenerateMiniProgram
} from '../services/wechatService';
import { AppError } from '../middleware/errorHandler';

/**
 * 微信小程序登录
 */
export const wechatMiniProgramLoginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      throw new AppError('缺少code参数', 400, 400);
    }
    
    // 调用微信登录接口
    const wechatResult = await wechatLogin(code);
    const { openid, session_key, unionid } = wechatResult;
    
    // 查找或创建用户
    const { dbPool } = require('../config/database');
    
    let userId: number;
    const userResult: any = await dbPool!.query(
      'SELECT id FROM users WHERE phone = $1',
      [`wechat_${openid}`] // 使用openid作为手机号占位
    );
    
    if (userResult.rows.length > 0) {
      // 用户已存在
      userId = userResult.rows[0].id;
    } else {
      // 创建新用户（需要邀请码）
      // 这里简化为直接创建，实际应该引导用户完成注册流程
      throw new AppError('请先使用手机号注册', 400, 1001);
    }
    
    // 生成JWT Token
    const { generateToken } = require('../services/authService');
    const token = generateToken(userId);
    
    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user_id: userId,
        openid
      }
    });
  } catch (error: any) {
    if (error.message.includes('请先使用手机号注册')) {
      next(new AppError(error.message, 400, 1001));
    } else {
      next(error);
    }
  }
};

/**
 * 检查小程序解锁状态
 */
export const checkMiniProgramUnlockController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const result = await checkMiniProgramUnlock(userId);
    
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
 * 生成小程序码
 */
export const generateMiniProgramQRCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { page_path } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // 检查是否已解锁
    const unlockStatus = await checkMiniProgramUnlock(userId);
    
    if (!unlockStatus.unlocked) {
      throw new AppError('尚未解锁小程序', 403, 403);
    }
    
    // 生成小程序码
    const qrCodeUrl = await generateMiniProgramQRCode(
      userId,
      page_path || 'pages/territory/index'
    );
    
    res.status(200).json({
      code: 200,
      message: '生成成功',
      data: {
        qr_code_url: qrCodeUrl
      }
    });
  } catch (error: any) {
    if (error.message.includes('尚未解锁小程序')) {
      next(new AppError(error.message, 403, 403));
    } else {
      next(error);
    }
  }
};

/**
 * 自动生成小程序（供邀请服务调用）
 */
export const triggerAutoGenerateMiniProgram = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // 自动生成小程序
    await autoGenerateMiniProgram(userId);
    
    res.status(200).json({
      code: 200,
      message: '自动生成成功'
    });
  } catch (error) {
    next(error);
  }
};
