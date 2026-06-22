import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { setBrowseContext } from '../utils/contextStore';

/**
 * 埋点事件接收
 */
export const trackEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deviceId = (req as any).deviceId;
    const userId = (req as any).user?.userId || null;
    const { event_name, event_data } = req.body;

    if (!event_name) {
      return res.status(400).json({
        code: 400,
        message: '事件名称不能为空'
      });
    }

    if (!dbPool) throw new Error('数据库连接未初始化');

    // 插入埋点记录
    await dbPool.query(
      'INSERT INTO action_logs (device_id, user_id, event_name, event_data, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        deviceId,
        userId,
        event_name,
        event_data ? JSON.stringify(event_data) : null,
        req.ip,
        req.get('user-agent')
      ]
    );

    // 如果是浏览上下文相关事件，更新 contextStore
    if (event_name === 'guest_browse_duration' && event_data?.current_page) {
      const { lastBrowsePostId, lastBrowseClubId } = event_data;
      if (lastBrowsePostId || lastBrowseClubId) {
        setBrowseContext(deviceId, { lastBrowsePostId, lastBrowseClubId });
      }
    }

    res.status(200).json({
      code: 200,
      message: '埋点记录成功'
    });
  } catch (error) {
    logger.error('埋点记录失败', { error });
    next(error);
  }
};

/**
 * 停留时长心跳上报
 */
export const trackDwellController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deviceId = (req as any).deviceId;
    const { current_page, duration_seconds } = req.body;

    if (!current_page) {
      return res.status(400).json({
        code: 400,
        message: '当前页面不能为空'
      });
    }

    if (!dbPool) throw new Error('数据库连接未初始化');

    // 累加停留时长（使用 UPSERT）
    await dbPool.query(
      `INSERT INTO dwell_stats (device_id, current_page, duration_seconds) 
       VALUES ($1, $2, $3)
       ON CONFLICT (device_id, current_page)
       DO UPDATE SET 
         duration_seconds = dwell_stats.duration_seconds + $3,
         last_heartbeat_at = NOW()`,
      [deviceId, current_page, duration_seconds || 30]
    );

    res.status(200).json({
      code: 200,
      message: '停留时长记录成功'
    });
  } catch (error) {
    logger.error('停留时长记录失败', { error });
    next(error);
  }
};
