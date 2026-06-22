/**
 * 游客上下文保留工具（基于内存的简单实现）
 * 实际生产环境可替换为 Redis
 * 
 * 存储结构：
 * - browseContext: { deviceId -> { lastBrowsePostId, lastBrowseClubId, timestamp } }
 * - TTL: 7 天
 */

interface BrowseContext {
  lastBrowsePostId?: number;
  lastBrowseClubId?: number;
  timestamp: number;
}

// 内存存储（7天 TTL）
const contextMap = new Map<string, BrowseContext>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

/**
 * 设置浏览上下文
 */
export const setBrowseContext = (
  deviceId: string,
  ctx: { lastBrowsePostId?: number; lastBrowseClubId?: number }
) => {
  contextMap.set(deviceId, {
    ...ctx,
    timestamp: Date.now(),
  });
};

/**
 * 获取浏览上下文
 */
export const getBrowseContext = (deviceId: string): BrowseContext | null => {
  const ctx = contextMap.get(deviceId);
  if (!ctx) return null;

  // 检查 TTL
  if (Date.now() - ctx.timestamp > TTL_MS) {
    contextMap.delete(deviceId);
    return null;
  }

  return ctx;
};

/**
 * 清理过期数据
 */
export const cleanExpiredContext = () => {
  const now = Date.now();
  for (const [key, ctx] of contextMap.entries()) {
    if (now - ctx.timestamp > TTL_MS) {
      contextMap.delete(key);
    }
  }
};

// 定时清理（每小时执行一次）
setInterval(cleanExpiredContext, 60 * 60 * 1000);
