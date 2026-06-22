import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { AppError } from './errorHandler';

/**
 * JWT认证中间件
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 提取Token
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    throw new AppError('未提供认证Token', 401, 401);
  }
  
  // 验证Token
  const payload = verifyToken(token);
  
  if (!payload) {
    throw new AppError('Token无效或已过期', 401, 401);
  }
  
  // 将用户信息附加到请求对象
  (req as any).user = payload;
  
  next();
};

/**
 * 角色权限中间件
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new AppError('无权限访问', 403, 403);
    }
    
    next();
  };
};
