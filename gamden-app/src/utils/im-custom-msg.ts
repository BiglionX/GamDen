/**
 * GamDen 自定义 IM 消息工具
 * ----------------------------------------------------------------------
 * 不修改 OpenIM 核心源码，仅在业务侧扩展自定义 contentType：
 *   - 115  表情消息（兼容 OpenIM 文本通道，存 unicode）
 *   - 200  守护灵系统通知（特殊气泡 + 守护灵头像）
 *   - 201  入群欢迎消息
 *
 * 设计要点：
 *   1. 所有自定义消息以 JSON 字符串塞入 OpenIM Message.content
 *   2. 发送时通过 createCustomMessage() 构造结构体
 *   3. 接收时通过 parseCustomMessage() 反解（带 try/catch 兜底）
 *   4. 接收方从未知版本降级时，renderType 自动回退到 text
 */

import type {
  ChatMessage,
  EmojiMessageBody,
  GuardianNoticeBody,
  GuardianType,
  IMContentType,
  TextMessageBody,
  WelcomeMessageBody,
} from '@/types/club';

// 重新导出常用类型，方便组件 import
export type { GuardianType };

/** 自定义消息 contentType 常量（与 types/club.ts IMContentType 对齐） */
export const CUSTOM_MSG_TYPE = {
  TEXT: 101,
  EMOJI: 115,
  GUARDIAN_NOTICE: 200,
  WELCOME: 201,
} as const;

/**
 * OpenIM Message 原型（仅声明本工具用到的字段，完整字段由 SDK 提供）
 */
export interface RawIMMessage {
  clientMsgID: string;
  serverMsgID?: string;
  sendID: string;
  recvID?: string;
  groupID?: string;
  sessionType: 1 | 2 | 3;
  contentType: number;
  content: string;
  sendTime: number;
  senderNickname?: string;
  senderFaceURL?: string;
  [key: string]: unknown;
}

/** 自定义消息通用载荷（所有自定义消息都用这个 shape） */
interface CustomEnvelope<T extends string, P> {
  /** 自定义协议版本（升级用） */
  v: 1;
  /** 子类型标记 */
  kind: T;
  /** 载荷 */
  data: P;
  /** 发送方补充信息（昵称、头像） */
  meta?: {
    nickname?: string;
    avatar?: string;
  };
}

/** 构建 OpenIM 通用 createTextMessage/createCustomMessage 的输入 */
export interface BuildMessageInput {
  clientMsgID?: string;
  sendID: string;
  sendName: string;
  sendAvatar: string;
  groupID: string;
  sendTime?: number;
}

// ============================================================
// 序列化：把业务对象 -> OpenIM Message content 字符串
// ============================================================

/**
 * 构造文本消息
 */
export function buildTextMessage(
  text: string,
  ctx: BuildMessageInput,
): RawIMMessage {
  const body: TextMessageBody = { text };
  return {
    clientMsgID: ctx.clientMsgID ?? `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    groupID: ctx.groupID,
    sessionType: 2,
    contentType: CUSTOM_MSG_TYPE.TEXT,
    content: JSON.stringify(body),
    sendTime: ctx.sendTime ?? Date.now(),
    senderNickname: ctx.sendName,
    senderFaceURL: ctx.sendAvatar,
  };
}

/**
 * 构造表情消息（unicode emoji）
 */
export function buildEmojiMessage(
  emoji: string,
  ctx: BuildMessageInput,
  index?: number,
): RawIMMessage {
  const body: EmojiMessageBody = index !== undefined ? { emoji, index } : { emoji };
  return {
    clientMsgID: ctx.clientMsgID ?? `emo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    groupID: ctx.groupID,
    sessionType: 2,
    contentType: CUSTOM_MSG_TYPE.EMOJI,
    content: JSON.stringify(body),
    sendTime: ctx.sendTime ?? Date.now(),
    senderNickname: ctx.sendName,
    senderFaceURL: ctx.sendAvatar,
  };
}

/**
 * 构造守护灵系统通知
 *
 * @example
 *   buildGuardianNotice({
 *     kind: 'levelUp',
 *     actorName: '胡桃的猫',
 *     guardianType: 'elf',
 *     title: '领地升级',
 *     content: '已达 Lv.8，解锁【秘银矿井】',
 *     level: 8,
 *   }, ctx)
 */
export function buildGuardianNotice(
  payload: Omit<GuardianNoticeBody, 'timestamp'>,
  ctx: BuildMessageInput,
): RawIMMessage {
  const body: GuardianNoticeBody = { ...payload, timestamp: Date.now() };
  return {
    clientMsgID: ctx.clientMsgID ?? `grd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    groupID: ctx.groupID,
    sessionType: 2,
    contentType: CUSTOM_MSG_TYPE.GUARDIAN_NOTICE,
    content: JSON.stringify(body),
    sendTime: body.timestamp,
    senderNickname: ctx.sendName,
    senderFaceURL: ctx.sendAvatar,
  };
}

/**
 * 构造入群欢迎消息
 */
export function buildWelcomeMessage(
  payload: Omit<WelcomeMessageBody, 'joinedAt'>,
  ctx: BuildMessageInput,
): RawIMMessage {
  const body: WelcomeMessageBody = { ...payload, joinedAt: Date.now() };
  return {
    clientMsgID: ctx.clientMsgID ?? `wel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    groupID: ctx.groupID,
    sessionType: 2,
    contentType: CUSTOM_MSG_TYPE.WELCOME,
    content: JSON.stringify(body),
    sendTime: body.joinedAt,
    senderNickname: ctx.sendName,
    senderFaceURL: ctx.sendAvatar,
  };
}

// ============================================================
// 反序列化：OpenIM Message -> ChatMessage（UI 模型）
// ============================================================

/**
 * 把 OpenIM 原始消息解析为 ChatMessage
 * - 未知 contentType / 解析失败 → 降级为 text 渲染
 */
export function parseCustomMessage(
  raw: RawIMMessage,
  currentUserID: string,
): ChatMessage {
  const baseFields = {
    clientMsgID: raw.clientMsgID,
    serverMsgID: raw.serverMsgID,
    sendID: raw.sendID,
    sendName: raw.senderNickname ?? raw.sendID,
    sendAvatar: raw.senderFaceURL ?? '',
    groupID: raw.groupID ?? '',
    sessionType: 2 as const,
    contentType: raw.contentType as IMContentType,
    rawContent: raw.content,
    sendTime: raw.sendTime,
    isSelf: raw.sendID === currentUserID,
  };

  switch (raw.contentType) {
    case CUSTOM_MSG_TYPE.EMOJI: {
      const body = safeJsonParse<EmojiMessageBody>(raw.content, { emoji: '🙂' });
      return { ...baseFields, renderType: 'emoji', body };
    }
    case CUSTOM_MSG_TYPE.GUARDIAN_NOTICE: {
      const body = safeJsonParse<GuardianNoticeBody>(raw.content, {
        kind: 'memberEvent',
        actorName: baseFields.sendName,
        guardianType: 'mechanical' as GuardianType,
        title: '守护灵通告',
        content: '',
        timestamp: raw.sendTime,
      });
      return { ...baseFields, renderType: 'guardian', body };
    }
    case CUSTOM_MSG_TYPE.WELCOME: {
      const body = safeJsonParse<WelcomeMessageBody>(raw.content, {
        newMemberName: '新巢友',
        guardianType: 'mechanical' as GuardianType,
        avatar: '🛖',
        greeting: '欢迎加入巢穴！',
        joinedAt: raw.sendTime,
      });
      return { ...baseFields, renderType: 'welcome', body };
    }
    case CUSTOM_MSG_TYPE.TEXT:
    default: {
      const body = safeJsonParse<TextMessageBody>(raw.content, { text: raw.content });
      return { ...baseFields, renderType: 'text', body };
    }
  }
}

/**
 * 通用 JSON 安全解析
 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as T;
  } catch {
    /* 忽略，降级到 fallback */
  }
  return fallback;
}

// ============================================================
// 守护灵视觉映射（与 types/agent.ts GUARDIAN_VISUALS 对齐）
// ============================================================

export const GUARDIAN_ICON: Record<GuardianType, string> = {
  mechanical: '⚙️',
  elf: '🌿',
  astrologer: '🔮',
};

export const GUARDIAN_COLOR: Record<GuardianType, string> = {
  mechanical: '#8B7355',
  elf: '#7AA06E',
  astrologer: '#9B8AC4',
};

export const GUARDIAN_NAME: Record<GuardianType, string> = {
  mechanical: '机械师',
  elf: '精灵',
  astrologer: '占星师',
};

// ============================================================
// 发送入口：通过 OpenIM SDK 真正发送
// ============================================================

/**
 * 通过 OpenIM SDK 发送消息的通用入口
 * - 调用方需保证 SDK 已初始化且用户已登录
 * - 真实 SDK 调用会被 try/catch 包裹，失败时返回 null
 */
export async function sendMessageViaSDK(msg: RawIMMessage): Promise<boolean> {
  try {
    const sdkModule = await import('@/utils/im');
    const sdk = sdkModule.im.getSDK();
    if (!sdk || typeof sdk.sendMessage !== 'function') {
      console.warn('[im-custom-msg] SDK 不可用，跳过发送');
      return false;
    }
    // OpenIM SDK 的 sendMessage 签名（与 openim-uniapp-polyfill 一致）
    await sdk.sendMessage({
      clientMsgID: msg.clientMsgID,
      sendID: msg.sendID,
      groupID: msg.groupID,
      sessionType: msg.sessionType,
      contentType: msg.contentType,
      content: msg.content,
      sendTime: msg.sendTime,
    });
    return true;
  } catch (e) {
    console.error('[im-custom-msg] 发送失败:', e);
    return false;
  }
}
