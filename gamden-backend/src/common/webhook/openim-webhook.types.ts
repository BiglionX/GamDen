/**
 * OpenIM Webhook 事件类型定义
 *
 * 文档参考：https://docs.openim.io/restapi/webhook
 *
 * OpenIM Server 在以下事件发生时，会向业务后端配置的 callbackURL
 * 发起 POST 请求，body 为 JSON，header 携带签名用于防伪。
 *
 * 本文件只定义 V1.0 我们关心的三种事件：
 *  - user.register   用户注册后
 *  - message.send    用户发送消息后
 *  - group.create    群组创建后
 *
 * 后续扩展（V2.0+）：user.logout / group.dismiss / group.join / message.read 等
 */

/**
 * OpenIM Webhook 支持的事件命令字（command 字段）
 * - 注意：OpenIM 用 command 字段标识事件类型
 */
export type OpenIMWebhookCommand =
  | 'user.register'
  | 'message.send'
  | 'group.create'
  // 预留扩展
  | 'group.dismiss'
  | 'group.join'
  | 'user.logout';

/**
 * 关键词触发场景（消息关键词 → 业务事件映射）
 */
export type KeywordTriggerScene = 'beast' | 'team' | 'help';

/**
 * Webhook 顶层 envelope
 * - OpenIM 所有 Webhook 请求都使用相同 envelope
 */
export interface OpenIMWebhookEnvelope<T = unknown> {
  /** 事件命令字 */
  command: OpenIMWebhookCommand;
  /** 事件唯一 ID（OpenIM 生成，可用于幂等去重） */
  eventId?: string;
  /** 事件发生时间戳（秒） */
  timestamp?: number;
  /** 业务数据（结构因 command 而异） */
  data: T;
}

/* ============================================================
 * Event: user.register
 * ============================================================ */

/**
 * 用户注册事件 data 段
 * - 当 OpenIM 服务端通过 user_register API 创建账号后触发
 * - 我们需要在此时为该用户同步创建领地
 */
export interface UserRegisterEvent {
  /** 用户 ID（OpenIM userID，与 GamDen userId 保持一致） */
  userID: string;
  /** 昵称 */
  nickname: string;
  /** 头像 URL */
  faceURL?: string;
  /** 注册时间戳（秒） */
  createTime?: number;
  /** 扩展字段（OpenIM 的 ex 字段，JSON 字符串） */
  ex?: string;
}

/* ============================================================
 * Event: message.send
 * ============================================================ */

/**
 * 消息会话类型
 */
export type OpenIMSessionType = 'single' | 'group' | 'notification' | 'system';

/**
 * 单条消息发送事件 data 段
 */
export interface MessageSendEvent {
  /** 发送者 userID */
  sendID: string;
  /** 接收者（单聊是 userID，群聊是 groupID） */
  recvID: string;
  /** 会话类型 */
  sessionType: OpenIMSessionType;
  /** 群聊时为 groupID */
  groupID?: string;
  /** 客户端消息唯一 ID */
  clientMsgID: string;
  /** 服务端消息 ID */
  serverMsgID?: string;
  /** 消息类型（text/image/custom/...） */
  contentType: number;
  /** 文本内容（contentType=101 时） */
  content?: string;
  /** 发送时间戳（毫秒） */
  sendTime: number;
  /** 自定义扩展（JSON 字符串） */
  ex?: string;
}

/* ============================================================
 * Event: group.create
 * ============================================================ */

/**
 * 群组创建事件 data 段
 * - 当用户在 OpenIM 客户端创建群组后触发
 * - 我们需要在此时为该群组同步创建俱乐部
 */
export interface GroupCreateEvent {
  /** 群组 ID（OpenIM groupID） */
  groupID: string;
  /** 群名称 */
  groupName: string;
  /** 群主 userID */
  ownerUserID: string;
  /** 群成员数（创建时通常为 1） */
  memberCount?: number;
  /** 创建时间戳（秒） */
  createTime?: number;
  /** 扩展字段（ex，JSON 字符串） */
  ex?: string;
  /** 群头像 URL */
  faceURL?: string;
  /** 群介绍 */
  introduction?: string;
}

/* ============================================================
 * 签名相关
 * ============================================================ */

/**
 * OpenIM Webhook 签名约定
 * - 默认 Header：`x-openim-signature`
 * - 算法：HMAC-SHA256(secret, rawBody)
 * - 签名值：hex 编码（小写）
 *
 * 注意：不同版本的 OpenIM 字段名可能略有差异，常见的有：
 *  - x-openim-signature / X-OpenIM-Signature
 *  - signature / Signature
 *  - x-signature / X-Signature
 *
 * Guard 会依次尝试多个 Header 以兼容多版本
 */
export const SIGNATURE_HEADER_CANDIDATES = [
  'x-openim-signature',
  'x-signature',
  'signature',
] as const;

/**
 * OpenIM Webhook 响应格式（业务返回给 OpenIM 的 ack）
 * - 必须 errCode = 0 才表示 OpenIM 认为 webhook 处理成功
 * - errCode 非 0 会触发 OpenIM 重试
 */
export interface OpenIMWebhookAck {
  errCode: number;
  errMsg: string;
}

/**
 * 业务侧的事件处理结果（内部使用）
 */
export interface WebhookHandlerResult {
  /** 是否成功（决定 ack.errCode） */
  success: boolean;
  /** 日志消息 */
  message: string;
  /** 处理耗时（毫秒） */
  durationMs?: number;
  /** 处理的副作用（如创建的 territoryId / clubId） */
  sideEffects?: Record<string, unknown>;
}