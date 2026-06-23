/**
 * OpenIM 集成配置
 * ----------------------------------------------------------------------
 * - API 地址：OpenIM Server 后端 HTTP（默认 10002 端口）
 * - WS 地址：OpenIM WebSocket 网关（默认 10001 端口）
 * - Platform：1=Android, 2=iOS, 3=Web, 4=Linux, 5=miniProgram
 *
 * 所有地址由环境变量控制（H5 通过 vite.config 注入；小程序/APP 通过 manifest.json）
 * 默认值仅用于本地开发，**生产环境务必修改为真实域名**。
 */

/** IM 平台枚举（与 OpenIM Server 协议一致） */
export type IMPlatform = 1 | 2 | 3 | 4 | 5;

/** IM 平台常量 */
export const IM_PLATFORM = {
  ANDROID: 1,
  IOS: 2,
  WEB: 3,
  LINUX: 4,
  MINI_PROGRAM: 5,
} as const;

/** 当前运行端检测（基于 uniapp 编译条件） */
export function detectPlatform(): IMPlatform {
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return IM_PLATFORM.MINI_PROGRAM;
  // #endif
  // #ifdef APP-ANDROID
  return IM_PLATFORM.ANDROID;
  // #endif
  // #ifdef APP-IOS
  return IM_PLATFORM.IOS;
  // #endif
  // #ifdef H5
  return IM_PLATFORM.WEB;
  // #endif
  return IM_PLATFORM.WEB;
}

/** OpenIM 初始化配置 */
export interface IMConfig {
  /** OpenIM API 地址（HTTP/HTTPS） */
  apiURL: string;
  /** OpenIM WebSocket 地址（ws/wss） */
  wsURL: string;
  /** 平台 ID */
  platform: IMPlatform;
  /** App 标识（OpenIM Server 用于统计） */
  appId?: string;
  /** 日志级别：0=debug, 1=info, 2=warn, 3=error */
  logLevel?: number;
  /** IM 用户 ID 类型（仅在自定义 ID 时需要） */
  userIDType?: 'uuid' | 'numeric' | 'string';
}

/** 默认配置 - 可在 main.ts 中通过 setIMConfig 覆盖 */
export const DEFAULT_IM_CONFIG: IMConfig = {
  // 本地开发默认值；生产环境请通过 setIMConfig 注入实际域名
  apiURL: 'http://43.160.220.131:10002',
  wsURL: 'ws://43.160.220.131:10001',
  platform: detectPlatform(),
  appId: 'gamden',
  logLevel: 1,
  userIDType: 'string',
};

/** 允许外部覆盖的全局配置 */
let runtimeConfig: IMConfig = { ...DEFAULT_IM_CONFIG };

/** 设置 IM 运行时配置（在 main.ts 启动前调用） */
export function setIMConfig(partial: Partial<IMConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...partial };
}

/** 获取当前生效的 IM 配置 */
export function getIMConfig(): IMConfig {
  return runtimeConfig;
}

// ----------------------------------------------------------------------
// 事件常量
// ----------------------------------------------------------------------

/** OpenIM SDK 事件名（与 openim-uniapp-polyfill 协议一致） */
export const IM_EVENTS = {
  /** WS 连接成功 */
  CONNECT_SUCCESS: 'connectSuccess',
  /** WS 连接失败 */
  CONNECT_FAIL: 'connectFailed',
  /** WS 正在连接 */
  CONNECTING: 'connecting',
  /** 主动断开 */
  DISCONNECT: 'disconnect',
  /** 多端登录被踢下线 */
  KICKED_OFFLINE: 'kickedOffline',
  /** IM token 过期 */
  USER_TOKEN_EXPIRED: 'userTokenExpired',
  /** 新消息到达 */
  NEW_MESSAGE: 'newMessage',
  /** 会话列表变化 */
  CONVERSATION_CHANGED: 'conversationChanged',
  /** 未读总数变化 */
  TOTAL_UNREAD_MESSAGE_COUNT_CHANGED: 'totalUnreadMessageCountChanged',
  /** 消息已读回执变化 */
  MESSAGE_READ_RECEIPT_LIST_CHANGED: 'messageReadReceiptListChanged',
} as const;

export type IMEventName = (typeof IM_EVENTS)[keyof typeof IM_EVENTS];

/** 未读总数变化 payload */
export interface UnreadCountPayload {
  totalCount: number;
}

/** 新消息 payload（OpenIM 标准 Message 结构的关键字段） */
export interface NewMessagePayload {
  clientMsgID: string;
  serverMsgID: string;
  sendID: string;
  recvID: string;
  groupID?: string;
  sessionType: 1 | 2 | 3; // 1=单聊 2=群聊 3=通知
  contentType: number;
  content: string;
  sendTime: number;
  // 其他字段省略，运行时透传给上层
  [key: string]: unknown;
}