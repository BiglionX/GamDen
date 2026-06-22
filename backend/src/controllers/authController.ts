import { Request, Response, NextFunction } from 'express';
import { register, login, refreshToken, changePassword, resetPassword, deleteAccount, registerByPhone, loginByPhone } from '../services/authService';
import { sendSmsCode, verifySmsCode, SmsPurpose } from '../services/smsService';
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
      nickname,
      device_id: req.headers['x-device-id'] as string
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

/**
 * 发送短信验证码
 */
export const sendSmsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, purpose } = req.body;

    // 参数验证
    if (!phone || !purpose) {
      throw new AppError('参数不完整', 400, 400);
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new AppError('手机号格式错误', 400, 400);
    }

    // 用途验证
    const validPurposes: SmsPurpose[] = ['register', 'login', 'reset_pwd'];
    if (!validPurposes.includes(purpose)) {
      throw new AppError('用途参数无效', 400, 400);
    }

    // 发送验证码
    const success = await sendSmsCode(phone, purpose);
    if (!success) {
      throw new AppError('发送验证码失败，请稍后重试', 500, 500);
    }

    res.status(200).json({
      code: 200,
      message: '验证码已发送（开发模式请查看日志）',
      data: { expires_in: 300 } // 5分钟
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 验证短信验证码
 */
export const verifySmsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, code, purpose } = req.body;

    // 参数验证
    if (!phone || !code || !purpose) {
      throw new AppError('参数不完整', 400, 400);
    }

    // 验证码格式验证
    if (!/^\d{6}$/.test(code)) {
      throw new AppError('验证码格式错误', 400, 400);
    }

    // 用途验证
    const validPurposes: SmsPurpose[] = ['register', 'login', 'reset_pwd'];
    if (!validPurposes.includes(purpose)) {
      throw new AppError('用途参数无效', 400, 400);
    }

    // 验证验证码
    const valid = await verifySmsCode(phone, code, purpose);
    if (!valid) {
      throw new AppError('验证码错误或已过期', 400, 400);
    }

    res.status(200).json({
      code: 200,
      message: '验证成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手机号验证码注册
 */
export const registerByPhoneController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, sms_code, invite_code, guardian_type, nickname } = req.body;
    const device_id = req.headers['x-device-id'] as string || req.body.device_id;

    if (!phone || !sms_code || !invite_code || !guardian_type) {
      throw new AppError('参数不完整', 400, 400);
    }

    const validGuardianTypes = ['mechanic', 'elf', 'astrologer'];
    if (!validGuardianTypes.includes(guardian_type)) {
      throw new AppError('守护灵类型无效', 400, 400);
    }

    const result = await registerByPhone({
      phone,
      sms_code,
      invite_code,
      guardian_type,
      nickname,
      device_id
    });

    res.status(200).json({
      code: 200,
      message: '注册成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '邀请码无效或已过期') {
      next(new AppError(error.message, 400, 1001));
    } else if (error.message === '该设备已注册账号，不可重复注册') {
      next(new AppError(error.message, 400, 400));
    } else if (error.message === '邀请码已过期（超过30天）') {
      next(new AppError(error.message, 400, 1001));
    } else {
      next(error);
    }
  }
};

/**
 * 手机号验证码登录
 */
export const loginByPhoneController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, sms_code } = req.body;
    const device_id = req.headers['x-device-id'] as string || req.body.device_id;

    if (!phone || !sms_code) {
      throw new AppError('参数不完整', 400, 400);
    }

    const result = await loginByPhone({ phone, sms_code, device_id });

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '账号已被冻结') {
      next(new AppError(error.message, 403, 1006));
    } else {
      next(error);
    }
  }
};

/**
 * 修改密码
 */
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未登录', 401, 401);
    }

    if (!old_password || !new_password) {
      throw new AppError('参数不完整', 400, 400);
    }

    await changePassword(userId, old_password, new_password);

    res.status(200).json({
      code: 200,
      message: '密码修改成功'
    });
  } catch (error: any) {
    if (error.message === '原密码错误') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 重置密码（通过短信验证码）
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, sms_code, new_password } = req.body;

    if (!phone || !sms_code || !new_password) {
      throw new AppError('参数不完整', 400, 400);
    }

    await resetPassword(phone, sms_code, new_password);

    res.status(200).json({
      code: 200,
      message: '密码重置成功'
    });
  } catch (error: any) {
    if (error.message === '验证码错误或已过期') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 注销账号
 */
export const deleteAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未登录', 401, 401);
    }

    if (!password) {
      throw new AppError('请输入密码以确认注销', 400, 400);
    }

    await deleteAccount(userId, password);

    res.status(200).json({
      code: 200,
      message: '账号已注销，30天后数据将被彻底删除'
    });
  } catch (error: any) {
    if (error.message === '密码错误') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};
