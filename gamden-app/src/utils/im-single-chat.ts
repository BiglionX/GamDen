/**
 * GamDen 单聊消息工具
 * ----------------------------------------------------------------------
 * 基于 OpenIM 单聊能力（sessionType=1）做业务侧封装：
 *   1. 会话列表的拉取 / 过滤 / 投影
 *   2. 文本 / 表情 / 图片 消息的构建 + 发送
 *   3. OpenIM MessageItem -> SingleChatMessage 反序列化
 *
 * 设计要点：
 *   - 不修改 OpenIM 核心 SDK
 *   - 失败 / SDK 未就绪时给出安全降级（返回空 / 抛业务错误，不阻塞 UI）
 *   - 守护灵（contentType 200/201）在私聊场景下不发送（按需求过滤）
 */

import im from './im';
import type {
  ConversationListItem,
  EmojiMessageBody,
  IMSingleContentType,
  ImageMessageBody,
  SingleChatMessage,
  SingleChatPeer,
  TextMessageBody,
} from '@/types/im';

/**
 * OpenIM SDK 标准 contentType 常量
 */
export const SINGLE_CONTENT_TYPE = {
  TEXT: 101,
  PICTURE: 102,
  VOICE: 103,
  VIDEO: 104,
  FILE: 105,
  CUSTOM: 110,
  /** OpenIM 标准 face 表情（使用 unicode） */
  FACE: 115,
  /** GamDen 自定义：系统通知 */
  SYSTEM_NOTICE: 200,
  /** GamDen 自定义：守护灵通知（私聊场景不启用） */
  GUARDIAN_NOTICE: 201,
} as const;

/**
 * 单聊 sessionType（与 SDK SessionType.Single 对齐）
 */
export const SINGLE_SESSION_TYPE = 1 as const;

/**
 * OpenIM MessageItem 字段投影（仅声明本工具用到的字段）
 * - 真实 SDK 返回值包含完整 protobuf 字段，按需取用
 */
export interface RawSingleMessage {
  clientMsgID: string;
  serverMsgID?: string;
  sendID: string;
  recvID?: string;
  senderNickname?: string;
  senderFaceUrl?: string;
  sessionType: number;
  contentType: number;
  /** 原始 content（文本消息时是纯文本，自定义消息时是 JSON 字符串） */
  content: string;
  sendTime: number;
  /** 附加字段（图片 elem、位置 elem 等） */
  pictureElem?: {
    sourcePath?: string;
    sourcePicture?: { url?: string };
    snapshotPicture?: { url?: string; width?: number; height?: number };
  };
  faceElem?: { index?: number; data?: string };
  [key: string]: unknown;
}

/**
 * 发送上下文（发送方信息）
 */
export interface SendContext {
  sendID: string;
  sendName: string;
  sendAvatar: string;
  recvID: string;
}

// ============================================================
// 会话列表
// ============================================================

/**
 * 拉取单聊会话列表
 * - 仅返回 sessionType === 1 的会话
 * - 投影为前端需要的 ConversationListItem
 */
export async function fetchSingleChatConversations(): Promise<ConversationListItem[]> {
  const list = await im.getConversationList();
  if (!list || list.length === 0) return [];

  return list
    .filter((c: any) => Number(c.conversationType ?? c.sessionType) === SINGLE_SESSION_TYPE)
    .map((c: any) => ({
      conversationID: c.conversationID,
      userID: c.userID || '',
      showName: c.showName || c.userID || '未知巢友',
      faceURL: c.faceURL || '',
      unreadCount: Number(c.unreadCount || 0),
      latestMsg: formatLatestMsg(c.latestMsg, c.contentType),
      latestMsgSendTime: Number(c.latestMsgSendTime || 0),
      sessionType: SINGLE_SESSION_TYPE,
      isPinned: !!c.isPinned,
    }))
    .sort((a: ConversationListItem, b: ConversationListItem) => {
      // 置顶优先，再按时间倒序
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.latestMsgSendTime - a.latestMsgSendTime;
    });
}

/**
 * 把 OpenIM latestMsg（JSON）格式化为 UI 预览文本
 */
export function formatLatestMsg(latestMsg: unknown, contentType: number): string {
  if (typeof latestMsg !== 'string' || !latestMsg) return '';
  try {
    const parsed = JSON.parse(latestMsg);
    if (parsed && typeof parsed.text === 'string') return parsed.text;
    if (parsed && typeof parsed.content === 'string') return parsed.content;
  } catch {
    /* 不是 JSON，按纯文本处理 */
  }
  // contentType 路由
  switch (contentType) {
    case SINGLE_CONTENT_TYPE.PICTURE:
      return '[图片]';
    case SINGLE_CONTENT_TYPE.VOICE:
      return '[语音]';
    case SINGLE_CONTENT_TYPE.VIDEO:
      return '[视频]';
    case SINGLE_CONTENT_TYPE.FILE:
      return '[文件]';
    case SINGLE_CONTENT_TYPE.FACE:
      return '[表情]';
    case SINGLE_CONTENT_TYPE.SYSTEM_NOTICE:
      return '[系统通知]';
    default:
      return latestMsg;
  }
}

/**
 * 拉取（或构建）指定 peer 的会话信息
 * - SDK 中存在则返回已有会话
 * - 不存在则返回基于 conversationID 构造的最小可用对象
 */
export async function ensureSingleChatConversation(
  peer: Omit<SingleChatPeer, 'conversationID'> & { conversationID?: string },
): Promise<SingleChatPeer> {
  const conversationID =
    peer.conversationID || (await im.getConversationID(peer.userID, SINGLE_SESSION_TYPE));

  return {
    userID: peer.userID,
    nickname: peer.nickname,
    avatar: peer.avatar,
    conversationID,
    guardianType: peer.guardianType,
  };
}

// ============================================================
// 历史消息
// ============================================================

/**
 * 拉取单聊历史消息
 * @param conversationID 会话 ID
 * @param startClientMsgID 起始 clientMsgID（首次传空，向下滚动加载更多时传最早一条的 clientMsgID）
 */
export async function fetchSingleChatHistory(
  conversationID: string,
  startClientMsgID = '',
  count = 30,
): Promise<RawSingleMessage[]> {
  return im.getHistoryMessages(conversationID, count, startClientMsgID);
}

// ============================================================
// 消息反序列化（OpenIM -> UI 模型）
// ============================================================

/**
 * 解析单聊消息
 * - 已知 contentType：文本(101) / 表情(115) / 图片(102) / 系统通知(200)
 * - 其他类型降级为 text 渲染
 */
export function parseSingleMessage(
  raw: RawSingleMessage,
  currentUserID: string,
): SingleChatMessage {
  const baseFields = {
    clientMsgID: raw.clientMsgID,
    serverMsgID: raw.serverMsgID,
    sendID: raw.sendID,
    sendName: raw.senderNickname ?? raw.sendID,
    sendAvatar: raw.senderFaceUrl ?? '',
    recvID: raw.recvID ?? '',
    sessionType: SINGLE_SESSION_TYPE,
    contentType: raw.contentType as IMSingleContentType,
    rawContent: raw.content,
    sendTime: raw.sendTime,
    isSelf: raw.sendID === currentUserID,
  };

  switch (raw.contentType) {
    case SINGLE_CONTENT_TYPE.PICTURE: {
      const body: ImageMessageBody = {
        sourcePath: raw.pictureElem?.sourcePath,
        url: raw.pictureElem?.sourcePicture?.url,
        snapshotUrl: raw.pictureElem?.snapshotPicture?.url,
        width: raw.pictureElem?.snapshotPicture?.width,
        height: raw.pictureElem?.snapshotPicture?.height,
      };
      return { ...baseFields, renderType: 'image', body };
    }

    case SINGLE_CONTENT_TYPE.FACE: {
      // OpenIM faceElem.data 通常是 unicode 字符串
      let emoji = '';
      if (raw.faceElem?.data) {
        try {
          const parsed = JSON.parse(raw.faceElem.data);
          if (typeof parsed === 'string') emoji = parsed;
        } catch {
          emoji = raw.faceElem.data;
        }
      }
      if (!emoji) {
        // 部分版本把 emoji 直接放在 content 字段
        emoji = raw.content || '🙂';
      }
      const body: EmojiMessageBody = {
        emoji,
        index: typeof raw.faceElem?.index === 'number' ? raw.faceElem.index : undefined,
      };
      return { ...baseFields, renderType: 'emoji', body };
    }

    case SINGLE_CONTENT_TYPE.SYSTEM_NOTICE: {
      const body = safeJsonParse<{ text: string; kind?: 'friend' | 'system' | 'guardian' }>(
        raw.content,
        { text: raw.content, kind: 'system' as const },
      );
      return { ...baseFields, renderType: 'system', body };
    }

    case SINGLE_CONTENT_TYPE.TEXT:
    default: {
      // 文本消息的 content 通常是纯文本；自定义 101 也兼容
      let text = raw.content;
      try {
        const parsed = JSON.parse(raw.content);
        if (parsed && typeof parsed.text === 'string') {
          text = parsed.text;
        }
      } catch {
        /* 纯文本，忽略 */
      }
      const body: TextMessageBody = { text };
      return { ...baseFields, renderType: 'text', body };
    }
  }
}

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

// ============================================================
// 消息发送（文本 / 表情 / 图片）
// ============================================================

/**
 * 发送单聊文本消息
 * - 1. 调用 SDK createTextMessage 构造 MessageItem
 * - 2. 补齐 recvID / sendID
 * - 3. 调用 SDK sendMessage 发送
 *
 * 返回 { ok, message }：
 *   - ok=true 时 message 为 SDK 构造的完整 MessageItem
 *   - ok=false 时 message 为降级构造的最小可用对象（仅本地展示用）
 */
export async function sendSingleTextMessage(
  text: string,
  ctx: SendContext,
): Promise<{ ok: boolean; message: RawSingleMessage | null }> {
  if (!text.trim() || !ctx.recvID) {
    return { ok: false, message: null };
  }

  const sdkMessage = await im.createTextMessage(text.trim());
  if (sdkMessage) {
    const full = mergeSdkMessage(sdkMessage, ctx);
    const ok = await im.sendMessage(full);
    return { ok, message: full as RawSingleMessage };
  }

  // SDK 不可用时构造本地最小可用对象（仅本地展示，不真正发送）
  const fallback: RawSingleMessage = {
    clientMsgID: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    recvID: ctx.recvID,
    sessionType: SINGLE_SESSION_TYPE,
    contentType: SINGLE_CONTENT_TYPE.TEXT,
    content: JSON.stringify({ text: text.trim() }),
    sendTime: Date.now(),
    senderNickname: ctx.sendName,
    senderFaceUrl: ctx.sendAvatar,
  };
  console.warn('[im-single-chat] SDK 不可用，仅本地展示');
  return { ok: false, message: fallback };
}

/**
 * 发送单聊表情消息
 * - emoji: unicode 字符串
 * - index: 可选，表情包索引
 */
export async function sendSingleEmojiMessage(
  emoji: string,
  ctx: SendContext,
  index?: number,
): Promise<{ ok: boolean; message: RawSingleMessage | null }> {
  if (!emoji || !ctx.recvID) return { ok: false, message: null };

  const sdkMessage = await im.createFaceMessage(index ?? 0, emoji);
  if (sdkMessage) {
    const full = mergeSdkMessage(sdkMessage, ctx);
    const ok = await im.sendMessage(full);
    return { ok, message: full as RawSingleMessage };
  }

  const fallback: RawSingleMessage = {
    clientMsgID: `emo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    recvID: ctx.recvID,
    sessionType: SINGLE_SESSION_TYPE,
    contentType: SINGLE_CONTENT_TYPE.FACE,
    content: JSON.stringify({ emoji }),
    sendTime: Date.now(),
    senderNickname: ctx.sendName,
    senderFaceUrl: ctx.sendAvatar,
    faceElem: { index: index ?? 0, data: emoji },
  };
  return { ok: false, message: fallback };
}

/**
 * 发送单聊图片消息
 * - imagePath: 本地图片路径（uni.chooseImage 回调里的 path）
 */
export async function sendSingleImageMessage(
  imagePath: string,
  ctx: SendContext,
): Promise<{ ok: boolean; message: RawSingleMessage | null }> {
  if (!imagePath || !ctx.recvID) return { ok: false, message: null };

  const sdkMessage = await im.createImageMessage(imagePath);
  if (sdkMessage) {
    const full = mergeSdkMessage(sdkMessage, ctx);
    const ok = await im.sendMessage(full);
    return { ok, message: full as RawSingleMessage };
  }

  const fallback: RawSingleMessage = {
    clientMsgID: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    recvID: ctx.recvID,
    sessionType: SINGLE_SESSION_TYPE,
    contentType: SINGLE_CONTENT_TYPE.PICTURE,
    content: '',
    sendTime: Date.now(),
    senderNickname: ctx.sendName,
    senderFaceUrl: ctx.sendAvatar,
    pictureElem: { sourcePath: imagePath },
  };
  return { ok: false, message: fallback };
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 把 SDK 构造的 MessageItem 与发送方上下文合并
 * - 强制覆盖 recvID / sendID（确保与当前会话一致）
 * - 保留 SDK 设置的 clientMsgID / sendTime / content / contentType
 */
function mergeSdkMessage(sdkMessage: any, ctx: SendContext): Record<string, unknown> {
  return {
    ...sdkMessage,
    clientMsgID: sdkMessage.clientMsgID ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sendID: ctx.sendID,
    recvID: ctx.recvID,
    groupID: '',
    sessionType: SINGLE_SESSION_TYPE,
    senderNickname: ctx.sendName,
    senderFaceUrl: ctx.sendAvatar,
    sendTime: sdkMessage.sendTime ?? Date.now(),
  };
}

/**
 * 格式化最新消息时间（UI 列表用）
 * - 今天：HH:MM
 * - 昨天：昨天
 * - 本周：周X
 * - 更早：MM-DD
 */
export function formatLatestTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return '昨天';

  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  if (d.getTime() >= weekAgo.getTime()) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${weekdays[d.getDay()]}`;
  }

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}