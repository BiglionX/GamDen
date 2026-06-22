import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * 设备 ID 中间件
 * 解析 X-Device-ID Header，未提供则生成 guest-uuid
 * 写入 (req as any).deviceId
 */
export const deviceIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 优先从 Header 读取
  let deviceId = req.headers['x-device-id'] as string;

  // 回退到 body/query
  if (!deviceId) {
    deviceId = (req.body?.device_id as string) || (req.query?.device_id as string);
  }

  // 未传则生成 guest-uuid 并写入响应 Header
  if (!deviceId) {
    deviceId = `guest-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    logger.info('生成设备 ID（游客态）', { deviceId });
  }

  // 写入请求对象
  (req as any).deviceId = deviceId;

  // 设置响应 Header 引导前端持久化
  res.set('X-Device-ID', deviceId);

  next();
};
