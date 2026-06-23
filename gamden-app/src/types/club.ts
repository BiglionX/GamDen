/**
 * GamDen 俱乐部（群聊）类型定义
 * ----------------------------------------------------------------------
 * 复用了 OpenIM 的群聊能力（groupID、sessionType=2），本文件仅声明
 * 与 GamDen 业务绑定的展示模型。
 *
 * 真实运行数据流向：
 *   OpenIM SDK
 *     └─> Message (protobuf)
 *           └─> im.ts (utils) 解析 contentType / content
 *                 └─> useClubChatStore 转成 ChatMessage (本文件)
 *                       └─> pages/club/detail.vue 渲染
 */

import type { GuardianType } from './user';

// 重新导出，方便外部统一从 @/types/club 引用
export type { GuardianType };

/**
 * OpenIM 消息 contentType
 * - 101: 文本
 * - 102: 图片
 * - 103: 语音
 * - 104: 视频
 * - 105: 文件
 * - 106: 自定义 @消息
 * - 110: 撤销
 * - 115: 表情（GamDen 扩展）
 * - 200: 守护灵系统通知（GamDen 自定义）
 * - 201: 入群欢迎（GamDen 自定义）
 */
export type IMContentType =
  | 101
  | 102
  | 103
  | 104
  | 105
  | 106
  | 110
  | 115
  | 200
  | 201;

/**
 * 俱乐部（群聊）元数据
 */
export interface Club {
  id: string;
  /** 群组 ID（OpenIM groupID） */
  groupID: string;
  name: string;
  /** 游戏标签（用于搜索过滤） */
  gameTag: string;
  description: string;
  icon: string;
  memberCount: number;
  todayNewPosts: number;
  /** 群主 OpenIM userID */
  ownerID: string;
  createdAt: number;
}

/**
 * 俱乐部成员
 */
export interface ClubMember {
  userID: string;
  nickname: string;
  avatar: string;
  /** 角色：1=群主 2=管理员 3=普通 */
  role: 1 | 2 | 3;
  /** 守护灵类型 */
  guardianType?: GuardianType;
  /** 在线状态 */
  online?: boolean;
  joinedAt: number;
}

/**
 * 文本消息体
 */
export interface TextMessageBody {
  text: string;
}

/**
 * 表情消息体（unicode 表情或 emoji id）
 */
export interface EmojiMessageBody {
  /** unicode 表情或自定义 emoji id */
  emoji: string;
  /** 可选：表情包 index（用于检索图标） */
  index?: number;
}

/**
 * 守护灵系统通知消息体
 */
export interface GuardianNoticeBody {
  /** 通知类型：levelUp / territoryChange / memberEvent */
  kind: 'levelUp' | 'territoryChange' | 'memberEvent';
  /** 触发者昵称 */
  actorName: string;
  /** 守护灵类型 */
  guardianType: GuardianType;
  /** 通知标题 */
  title: string;
  /** 通知正文 */
  content: string;
  /** 关联等级或数值（levelUp 时使用） */
  level?: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 入群欢迎消息体
 */
export interface WelcomeMessageBody {
  /** 新成员昵称 */
  newMemberName: string;
  /** 守护灵类型 */
  guardianType: GuardianType;
  /** 头像 emoji */
  avatar: string;
  /** 欢迎语 */
  greeting: string;
  /** 加入时间戳 */
  joinedAt: number;
}

/**
 * 聊天消息（统一展示模型）
 */
export interface ChatMessage {
  clientMsgID: string;
  serverMsgID?: string;
  /** 发送者 OpenIM userID */
  sendID: string;
  sendName: string;
  sendAvatar: string;
  /** 群组 ID */
  groupID: string;
  sessionType: 2;
  /** 渲染用的消息类型（用于模板分发） */
  renderType: 'text' | 'emoji' | 'guardian' | 'welcome';
  contentType: IMContentType;
  /** 原始 content（JSON 字符串，由 OpenIM 传递） */
  rawContent: string;
  /** 解析后的内容（按 renderType 区分） */
  body: TextMessageBody | EmojiMessageBody | GuardianNoticeBody | WelcomeMessageBody;
  sendTime: number;
  /** 是否当前用户发送 */
  isSelf: boolean;
}

/**
 * 群成员面板视图状态
 */
export interface MemberPanelState {
  visible: boolean;
  loading: boolean;
  members: ClubMember[];
}

/**
 * 气泡皮肤配置（与 wxo_bubble_customize.json 对应）
 */
export interface BubbleSkinConfig {
  /** 主题色 */
  themeColor: string;
  /** 暗色主题背景 */
  bgColor: string;
  /** 气泡左/右 padding */
  bubblePadding: string;
  /** 气泡最大宽度（CSS 值） */
  bubbleMaxWidth: string;
  /** 古风边框纹理（CSS background-image 描述） */
  borderTexture: string;
  /** 自己的气泡背景渐变 */
  selfBubbleBg: string;
  /** 别人的气泡背景渐变 */
  otherBubbleBg: string;
  /** 守护灵通知气泡背景 */
  guardianBubbleBg: string;
  /** 入群欢迎气泡背景 */
  welcomeBubbleBg: string;
  /** 消息文字颜色 */
  textColor: string;
  /** 次要文字（时间、昵称） */
  subTextColor: string;
}
