import type { GuardianType } from './user';

// Re-export 让外部统一从 @/types/agent 导入
export type { GuardianType };

/**
 * 触发场景
 * - welcome          每日首次登录欢迎
 * - upgrade          领地升级
 * - invite           邀请好友成功
 * - guestGuide       游客浏览 30 秒软引导
 * - territory        邻居互动（扩展）
 * - firstEncounter   入驻引导：初次相遇
 * - askName          入驻引导：询问名字
 * - selectGuardian   入驻引导：守护灵选择
 * - alliance         入驻引导：结盟确认
 * - territoryLanding 入驻引导：领地落地
 * - newUserTask      入驻引导：新手任务
 * - taskComplete     入驻引导：任务完成
 */
export type AgentScene =
  | 'welcome'
  | 'upgrade'
  | 'invite'
  | 'guestGuide'
  | 'territory'
  | 'firstEncounter'
  | 'askName'
  | 'selectGuardian'
  | 'alliance'
  | 'territoryLanding'
  | 'newUserTask'
  | 'taskComplete';

/**
 * 游客引导弹窗触发场景（受限操作）
 * - default        通用场景兜底
 * - like           点赞帖子
 * - reply          回复帖子
 * - exchange       兑换道具
 * - greet          打招呼
 * - post           发帖
 * - sendMessage    发消息（私聊/俱乐部）
 * - firstEncounter 入驻引导：初次相遇（软引导气泡三选一随机）
 */
export type GuestGuideScene =
  | 'default'
  | 'like'
  | 'reply'
  | 'exchange'
  | 'greet'
  | 'post'
  | 'sendMessage'
  | 'firstEncounter';

/**
 * 受限操作场景的中文标签（用于弹窗主标题与埋点）
 */
export const GUEST_GUIDE_SCENE_LABEL: Record<GuestGuideScene, string> = {
  default: '继续探索',
  like: '点赞',
  reply: '回复',
  exchange: '兑换',
  greet: '打招呼',
  post: '发帖',
  sendMessage: '私聊',
  firstEncounter: '初次相遇',
};

/**
 * 单条话术（守护灵头像 + 台词 + 持续时间）
 */
export interface AgentLine {
  /** 守护灵类型 */
  guardian: GuardianType;
  /** 触发场景 */
  scene: AgentScene;
  /** 台词（中文，1-2 句，20 字内） */
  text: string;
  /** 展示毫秒（默认 5000） */
  duration?: number;
}

/**
 * 触发守护灵的输入参数
 */
export interface AgentTriggerPayload {
  scene: AgentScene;
  /** 自定义覆盖文案（可选） */
  text?: string;
  /** 自定义展示时长 */
  duration?: number;
}

/**
 * 守护灵视觉配置（与前端视觉系统对齐）
 */
export interface GuardianVisual {
  type: GuardianType;
  name: string;
  icon: string;
  /** 一句性格台词（注册选择页展示） */
  tagline: string;
  /** 详细描述 */
  description: string;
  /** 主题色（金色梯度变体） */
  color: string;
  /** 主题背景色 */
  bgColor: string;
}

export const GUARDIAN_VISUALS: Record<GuardianType, GuardianVisual> = {
  mechanical: {
    type: 'mechanical',
    name: '机械师',
    icon: '⚙️',
    tagline: '机械不会说谎。我会用数据为你守护每一寸领地。',
    description: '擅长锻造与数值，理性冷静。',
    color: '#A8A8A8', // 银灰
    bgColor: 'rgba(168, 168, 168, 0.15)',
  },
  elf: {
    type: 'elf',
    name: '精灵',
    icon: '🌿',
    tagline: '风会带来远方的消息。我陪你等每一个邻居到来。',
    description: '亲近自然，感性敏锐。',
    color: '#5A8F6C', // 生机绿
    bgColor: 'rgba(90, 143, 108, 0.15)',
  },
  astrologer: {
    type: 'astrologer',
    name: '占星师',
    icon: '✨',
    tagline: '星辰的轨迹里，我已经看到了你的未来。跟我来。',
    description: '通晓星象，神秘主义。',
    color: '#2C3E6B', // 星夜蓝
    bgColor: 'rgba(44, 62, 107, 0.15)',
  },
};
