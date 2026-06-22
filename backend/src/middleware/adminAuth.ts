import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * 管理员权限验证中间件
 * 验证用户是否已登录且具有管理员权限（operator或super_admin）
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      throw new AppError('未授权，请先登录', 401, 401);
    }
    
    const { role } = user;
    
    // 检查是否是管理员角色
    if (role !== 'operator' && role !== 'super_admin') {
      throw new AppError('权限不足，需要管理员权限', 403, 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 超级管理员权限验证中间件
 * 验证用户是否是超级管理员（super_admin）
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      throw new AppError('未授权，请先登录', 401, 401);
    }
    
    const { role } = user;
    
    // 检查是否是超级管理员
    if (role !== 'super_admin') {
      throw new AppError('权限不足，需要超级管理员权限', 403, 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 记录操作日志中间件
 * 在管理员操作完成后记录日志
 */
export const logOperation = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const user = (req as any).user;
    const operatorId = user?.userId;
    
    // 重写res.send以在操作完成后记录日志
    res.send = function(body: any): any {
      // 只在成功响应时记录日志
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAdminOperation({
          operatorId,
          action,
          target: JSON.stringify(req.params) || JSON.stringify(req.body),
          reason: req.body?.reason || '',
          oldValue: req.body?.old_value || '',
          newValue: req.body?.new_value || ''
        }).catch(err => console.error('记录操作日志失败:', err));
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};

/**
 * 记录管理员操作到数据库
 */
async function logAdminOperation(params: {
  operatorId?: number;
  action: string;
  target: string;
  reason: string;
  oldValue: string;
  newValue: string;
}) {
  try {
    const { dbPool } = require('../config/database');
    
    if (!dbPool) {
      console.warn('⚠️ 数据库连接未初始化，跳过操作日志');
      return;
    }
    
    await dbPool.query(
      `INSERT INTO operation_logs (operator_id, action, target, reason, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.operatorId || null,
        params.action,
        params.target,
        params.reason,
        params.oldValue,
        params.newValue
      ]
    );
  } catch (error: any) {
    console.error('记录操作日志失败:', error.message);
  }
}
