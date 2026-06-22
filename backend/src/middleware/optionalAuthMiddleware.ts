import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * 可选认证中间件
 * 有 Token 则解析，无 Token 不抛错（与 authMiddleware 区别）
 * 解析结果写入 (req as any).user + (req as any).identityType
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
      (req as any).identityType = 'user';
      logger.debug('可选认证：用户已登录', { userId: payload.userId });
    } else {
      // Token 无效，降级为游客
      (req as any).identityType = 'guest';
      logger.debug('可选认证：Token 无效，降级为游客');
    }
  } else {
    // 无 Token，游客态
    (req as any).identityType = 'guest';
  }

  next();
};
