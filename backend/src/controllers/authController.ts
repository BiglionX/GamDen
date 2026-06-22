import { Request, Response, NextFunction } from 'express';
import { register, login, refreshToken } from '../services/authService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * 用户注册
 */
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, password, invite_code, guardian_type, nickname } = req.body;
    
    // 参数验证
    if (!phone || !password || !invite_code || !guardian_type) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new AppError('手机号格式错误', 400, 400);
    }
    
    // 密码长度验证
    if (password.length < 8) {
      throw new AppError('密码长度至少8位', 400, 400);
    }
    
    // 守护灵类型验证
    const validGuardianTypes = ['mechanic', 'elf', 'astrologer'];
    if (!validGuardianTypes.includes(guardian_type)) {
      throw new AppError('守护灵类型无效', 400, 400);
    }
    
    // 调用注册服务
    const result = await register({
      phone,
      password,
      invite_code,
      guardian_type,
      nickname
    });
    
    // 返回成功响应
    res.status(200).json({
      code: 200,
      message: '注册成功',
      data: result
    });
  } catch (error: any) {
    // 处理特定错误
    if (error.message === '手机号已注册') {
      next(new AppError(error.message, 400, 400));
    } else if (error.message === '邀请码无效或已过期') {
      next(new AppError(error.message, 400, 1001));
    } else {
      next(error);
    }
  }
};

/**
 * 用户登录
 */
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, password } = req.body;
    
    // 参数验证
    if (!phone || !password) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    // 调用登录服务
    const result = await login({ phone, password });
    
    // 返回成功响应
    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (error: any) {
    // 处理特定错误
    if (error.message === '用户不存在' || error.message === '密码错误') {
      next(new AppError('手机号或密码错误', 401, 401));
    } else if (error.message === '账号已被冻结') {
      next(new AppError(error.message, 403, 1006));
    } else {
      next(error);
    }
  }
};

/**
 * 刷新Token
 */
export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refresh_token } = req.body;
    
    // 参数验证
    if (!refresh_token) {
      throw new AppError('refresh_token参数缺失', 400, 400);
    }
    
    // 调用刷新服务
    const result = await refreshToken(refresh_token);
    
    // 返回成功响应
    res.status(200).json({
      code: 200,
      message: '刷新成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Refresh Token无效或已过期') {
      next(new AppError(error.message, 401, 401));
    } else {
      next(error);
    }
  }
};

/**
 * 登出（客户端清除Token即可，服务端可选记录）
 */
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 可选：将Token加入黑名单（需要Redis）
    // 目前仅返回成功，由客户端清除Token
    
    res.status(200).json({
      code: 200,
      message: '登出成功'
    });
  } catch (error) {
    next(error);
  }
};
