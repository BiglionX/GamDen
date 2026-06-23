/**
 * IM 配置桥接层
 * ----------------------------------------------------------------------
 * 解决 im.ts / im-config.ts 在 club-chat store 中重复 import 的问题，
 * 并提供一个统一的"获取 SDK + 订阅事件"出口。
 *
 * 设计目的：
 *   - im-config.ts 仅导出常量/类型
 *   - im.ts 导出主入口 im (含 on/init/login)
 *   - im-config-bridge 把两者聚合并 re-export，让业务侧一次性 import
 */

import { im as imCore } from './im';
import { IM_EVENTS, type IMEventName } from './im-config';

export const im = imCore;
export { IM_EVENTS };
export type { IMEventName };

// 重新导出常用类型，避免上层到处穿透
export type { NewMessagePayload, UnreadCountPayload } from './im-config';
