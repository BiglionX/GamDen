import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * API限流中间件
 * 基于内存计数实现，每用户每分钟最多100次请求
 * 生产环境可替换为Redis实现
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_REQUESTS_PER_MINUTE = 100;
const WINDOW_MS = 60 * 1000; // 1分钟

// 定期清理过期条目（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 获取限流标识（用户ID或IP）
 */
const getRateLimitKey = (req: Request): string => {
  const user = (req as any).user;
  if (user?.userId) {
    return `user:${user.userId}`;
  }
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};

/**
 * API限流中间件
 * 每用户每分钟最多100次请求
 */
export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = getRateLimitKey(req);
  const now = Date.now();

  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    rateLimitMap.set(key, entry);
    next();
    return;
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    throw new AppError('请求过于频繁，请稍后再试', 429, 429);
  }

  // 设置限流信息头
  res.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_MINUTE));
  res.set('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS_PER_MINUTE - entry.count)));

  next();
};
