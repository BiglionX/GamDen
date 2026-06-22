/**
 * 埋点工具
 * 前端埋点上报，批量暂存 + 离线延迟上报
 */

import { trackingAPI } from '@/services/api';

// 事件队列
const eventQueue: Array<{ event_name: string; event_data?: any; timestamp: number }> = [];
let dwellStartTime: Record<string, number> = {};
let flushTimer: NodeJS.Timeout | null = null;

/**
 * 上报单个事件
 */
export const trackEvent = async (
  eventName: string,
  eventData?: any
) => {
  const event = {
    event_name: eventName,
    event_data: eventData,
    timestamp: Date.now(),
  };

  eventQueue.push(event);

  // 批量上报（每 5 个事件或 10 秒触发一次）
  if (eventQueue.length >= 5) {
    await flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => flushEvents(), 10000);
  }
};

/**
 * 批量上报
 */
const flushEvents = async () => {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue.length = 0;

  try {
    for (const event of events) {
      await trackingAPI.trackEvent({
        event_name: event.event_name,
        event_data: event.event_data,
      });
    }
  } catch (error) {
    console.error('埋点上报失败', error);
    // 失败的事件重新入队
    eventQueue.unshift(...events);
  }
};

/**
 * 转化埋点（如注册成功）
 */
export const trackConversion = (action: string, extra?: any) => {
  trackEvent('conversion', { action_type: action, ...extra });
};

/**
 * 页面浏览埋点
 */
export const trackPageView = (pageName: string) => {
  trackEvent('guest_browse_duration', {
    current_page: pageName,
  });
};

/**
 * 点击埋点
 */
export const trackClick = (action: string, pageName: string, extra?: any) => {
  trackEvent('guest_click_restricted', {
    action_type: action,
    page_name: pageName,
    ...extra,
  });
};

/**
 * 开始停留计时
 */
export const trackDwellStart = (pageName: string) => {
  dwellStartTime[pageName] = Date.now();
};

/**
 * 结束停留计时并上报
 */
export const trackDwellEnd = async (pageName: string) => {
  const startTime = dwellStartTime[pageName];
  if (!startTime) return;

  const duration = Math.floor((Date.now() - startTime) / 1000); // 秒
  delete dwellStartTime[pageName];

  try {
    await trackingAPI.trackDwell({
      current_page: pageName,
      duration_seconds: duration,
    });
  } catch (error) {
    console.error('停留时长上报失败', error);
  }
};

/**
 * 自动心跳上报（每 30 秒）
 */
export const startDwellHeartbeat = (pageName: string) => {
  const interval = setInterval(async () => {
    try {
      await trackingAPI.trackDwell({
        current_page: pageName,
        duration_seconds: 30,
      });
    } catch (error) {
      console.error('心跳上报失败', error);
    }
  }, 30000);

  return () => clearInterval(interval);
};

// 页面卸载时批量上报
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });
}
