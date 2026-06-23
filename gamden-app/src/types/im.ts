/**
 * GamDen 单聊 IM 类型定义
 * ----------------------------------------------------------------------
 * 复用 OpenIM 的单聊能力（sessionType=1），本文件仅声明与 GamDen 业务
 * 绑定的展示模型。
 *
 * 真实运行数据流向：
 *   OpenIM SDK
 *     └─> MessageItem (protobuf / ConversationItem)
 *           └─> utils/im-single-chat.ts 解析 contentType / content
 *                 └─> useSingleChatStore 转成 SingleChatMessage (本文件)
 *                       └─> pages/im/chat.vue 渲染
 */

import type { GuardianType } from './user';

/** OpenIM 会话类型（与 SDK 枚举对齐） */
export type IMSessionType = 1 | 2 | 3 | 4;

/**
 * OpenIM contentType（与 SDK MessageType 对齐 + GamDen 扩展）
 *  - 101: 文本
 *  - 102: 图片
 *  - 103: 语音
 *  - 104: 视频
 *  - 105: 文件
 *  - 110: 自定义
 *  - 115: 表情（OpenIM 标准）
 *  - 200: 系统通知（GamDen 自定义）
 *  - 201: 守护灵消息（保留，私聊场景不使用）
 */
export type IMSingleContentType =
  | 101
  | 102
  | 103
  | 104
  | 105
  | 110
  | 115
  | 200
  | 201;

/**
 * 单聊会话的对方（Peer）
 * - userID: OpenIM userID（与 GamDen userId 一致）
 * - nickname: 展示名（私聊标题）
 * - avatar: emoji 或 URL
 * - conversationID: OpenIM 会话 ID
 * - guardianType: 对方的守护灵（用于皮肤着色，可选）
 */
export interface SingleChatPeer {
  userID: string;
  nickname: string;
  avatar: string;
  conversationID: string;
  guardianType?: GuardianType;
  /** 离线 / 在线状态（V1.0 可选） */
  online?: boolean;
}

/**
 * 会话列表项（OpenIM ConversationItem 的轻量投影）
 * - 仅保留单聊 UI 需要的字段
 */
export interface ConversationListItem {
  conversationID: string;
  /** 会话对方 userID（单聊） */
  userID: string;
  /** 展示名 */
  showName: string;
  /** 头像 */
  faceURL: string;
  /** 未读条数 */
  unreadCount: number;
  /** 最近一条消息预览文本 */
  latestMsg: string;
  /** 最近消息时间（ms） */
  latestMsgSendTime: number;
  /** OpenIM 会话类型（单聊固定为 1） */
  sessionType: 1;
  /** 是否置顶 */
  isPinned?: boolean;
}

/**
 * 文本消息体
 */
export interface TextMessageBody {
  text: string;
}

/**
 * 表情消息体
 * - emoji: unicode 表情（前端可直接渲染）
 * - index: 表情包索引（用于将来扩展自定义表情图）
 */
export interface EmojiMessageBody {
  emoji: string;
  index?: number;
}

/**
 * 图片消息体（OpenIM PictureElem 的轻量投影）
 */
export interface ImageMessageBody {
  /** 本地路径（发送中） */
  sourcePath?: string;
  /** 远端图片 URL */
  url?: string;
  /** 缩略图 URL */
  snapshotUrl?: string;
  width?: number;
  height?: number;
}

/**
 * 系统通知消息体（如「你已添加 XX 为好友」）
 */
export interface SystemMessageBody {
  text: string;
  kind?: 'friend' | 'system' | 'guardian';
}

/**
 * 单聊消息的统一展示模型
 * - 渲染层不感知 OpenIM 原始结构
 */
export interface SingleChatMessage {
  clientMsgID: string;
  serverMsgID?: string;
  sendID: string;
  sendName: string;
  sendAvatar: string;
  recvID: string;
  /** 固定 1（单聊） */
  sessionType: 1;
  /** 渲染用的消息类型（用于模板分发） */
  renderType: 'text' | 'emoji' | 'image' | 'system';
  contentType: IMSingleContentType;
  /** 原始 content（JSON 字符串或纯文本，由 OpenIM 传递） */
  rawContent: string;
  /** 解析后的内容（按 renderType 区分） */
  body: TextMessageBody | EmojiMessageBody | ImageMessageBody | SystemMessageBody;
  sendTime: number;
  /** 是否当前用户发送 */
  isSelf: boolean;
  /** 发送状态（仅自己消息有意义） */
  status?: 'sending' | 'success' | 'failed';
}