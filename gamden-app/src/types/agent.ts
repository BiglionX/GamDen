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
 * - agent_lv2~lv10   守护灵等级升级
 * - bond_2~bond_5    亲密度升阶
 * - egg_daily_fortune 彩蛋：今日运势
 * - egg_device       彩蛋：设备状态
 * - egg_wind         彩蛋：今日风向
 * - egg_fortune      彩蛋：星象运势
 * - care_absence     主动关心：连续未登录
 * - care_consecutive 主动关心：连续登录
 * - care_neighbor    主动关心：新邻居
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
  | 'taskComplete'
  | 'agent_lv2'
  | 'agent_lv3'
  | 'agent_lv4'
  | 'agent_lv5'
  | 'agent_lv6'
  | 'agent_lv7'
  | 'agent_lv8'
  | 'agent_lv9'
  | 'agent_lv10'
  | 'bond_2'
  | 'bond_3'
  | 'bond_4'
  | 'bond_5'
  | 'egg_daily_fortune'
  | 'egg_device'
  | 'egg_wind'
  | 'egg_fortune'
  | 'care_absence'
  | 'care_consecutive'
  | 'care_neighbor';

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
  ranger: {
    type: 'ranger',
    name: '游侠',
    icon: '🏹',
    tagline: '地图上没有的路，我来开辟。走吧，去没人去过的地方。',
    description: '自由不羁，热爱冒险与未知。',
    color: '#C77D45', // 落日橙
    bgColor: 'rgba(199, 125, 69, 0.15)',
  },
  artisan: {
    type: 'artisan',
    name: '工匠',
    icon: '🔨',
    tagline: '每一块材料都有自己的脾气。我懂它们。',
    description: '热爱创造，沉迷打造与收集。',
    color: '#B5895A', // 锻铜金
    bgColor: 'rgba(181, 137, 90, 0.15)',
  },
  apostle: {
    type: 'apostle',
    name: '使徒',
    icon: '🛡️',
    tagline: '只要我还在，你就不会孤独。这是我的誓言。',
    description: '守护同伴，信念坚定。',
    color: '#7A4A8E', // 神圣紫
    bgColor: 'rgba(122, 74, 142, 0.15)',
  },
};

// ======================== 守护灵升级系统类型 ========================

/**
 * 守护灵成长状态
 */
export interface AgentState {
  agentLevel: number;      // 1-10
  exp: number;            // 当前经验值
  expToNext: number;      // 升级所需经验值
  bondLevel: number;      // 1-5
  bondPoints: number;     // 当前亲密度
  bondToNext: number;     // 升阶所需亲密度
  personalityTags: PersonalityTag[];
  unlockedEggs: EggType[];
  consecutiveDays: number;
  lastActiveAt: string;
  lastLevelUpAt: string | null;
}

/**
 * 每日EXP进度
 */
export interface DailyProgress {
  date: string;
  signInCount: number;
  postCount: number;
  likeCount: number;
  inviteCount: number;
  territoryCount: number;
  marketCount: number;
  expGained: number;
  bondGained: number;
  expRemaining: number;
  bondRemaining: number;
  actions: {
    signIn: { completed: boolean; max: number };
    post: { completed: boolean; max: number };
    like: { completed: boolean; max: number };
    invite: { completed: boolean; max: number };
    market: { completed: boolean; max: number };
  };
}

/**
 * 彩蛋类型
 */
export type EggType =
  | 'daily_fortune'    // 今日运势（占星师）
  | 'device_status'    // 设备状态（机械师）
  | 'wind_direction'  // 今日风向（精灵）
  | 'fate_meet'       // 宿命相遇（占星师）
  | 'plant'           // 守候草（精灵）
  | 'framerate';      // 帧率检测（机械师）

/**
 * 彩蛋配置
 */
export interface EggConfig {
  id: EggType;
  name: string;
  desc: string;
  unlocked: boolean;
}

/**
 * 性格标签
 */
export type PersonalityTag =
  | 'sharer'    // 爱分享的机灵鬼
  | 'social'    // 社交达人的守护者
  | 'builder'   // 工匠精神的共鸣者
  | 'observer';  // 沉默的观察者

/**
 * 性格标签配置
 */
export const PERSONality_TAG_CONFIG: Record<PersonalityTag, string> = {
  sharer: '爱分享的机灵鬼',
  social: '社交达人的守护者',
  builder: '工匠精神的共鸣者',
  observer: '沉默的观察者',
};

/**
 * 守护灵等级经验阈值
 */
export const AGENT_LEVEL_THRESHOLDS = [0, 50, 120, 220, 350, 520, 740, 1020, 1380, 1800];

/**
 * 亲密度阈值
 */
export const AGENT_BOND_THRESHOLDS = [0, 100, 250, 500, 800];

/**
 * 经验值获取规则
 */
export const EXP_RULES = {
  sign_in: 10,
  post: 5,
  like: 2,
  invite: 50,
  territory: 30,
  market: 2,
};

/**
 * 亲密度获取规则
 */
export const BOND_RULES = {
  dialogue: 5,
  task: 10,
  invite: 20,
  level_up: 20,
};

/**
 * 每日经验值上限
 */
export const DAILY_EXP_LIMITS = {
  sign_in: 10,
  post: 20,
  like: 10,
  invite: 150,
  market: 6,
};

/**
 * 彩蛋列表配置
 */
export const EGGS_CONFIG: EggConfig[] = [
  { id: 'daily_fortune', name: '今日运势', desc: '每日首次登录时触发', unlocked: false },
  { id: 'device_status', name: '设备状态', desc: '手机电量≤20%时触发', unlocked: false },
  { id: 'wind_direction', name: '今日风向', desc: '每日首次登录时触发', unlocked: false },
  { id: 'plant', name: '守候草', desc: '连续签到3天时触发', unlocked: false },
  { id: 'framerate', name: '帧率检测', desc: '地图滑动卡顿时触发', unlocked: false },
  { id: 'fate_meet', name: '宿命相遇', desc: '附近有同类守护灵时触发', unlocked: false },
];

/**
 * 升级场景话术
 */
export type AgentUpgradeLevel = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 对话类型
 */
export type DialogueType = 'daily_advice' | 'story' | 'memory';

/**
 * 快速问答配置
 */
export interface QuickQuestion {
  type: DialogueType;
  text: string;
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  { type: 'daily_advice', text: '今天有什么建议吗？' },
  { type: 'story', text: '讲个故事给我听吧。' },
  { type: 'memory', text: '你记得我上周提到的游戏吗？' },
];

// ======================== AI 智能对话系统类型 ========================

/**
 * 能量状态
 */
export interface EnergyStatus {
  dailyUsed: number;
  dailyFree: number;
  purchasedBalance: number;
  remaining: number;
  total: number;
  percentage: number;
  level: 'abundant' | 'low' | 'depleted';
  lastResetAt: string | null;
}

/**
 * 能量等级中文标签
 */
export const ENERGY_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  abundant: { label: '充沛', color: '#52c41a' },
  low: { label: '低能量', color: '#faad14' },
  depleted: { label: '已休息', color: '#f5222d' }
};

/**
 * AI 对话消息
 */
export interface ChatMessage {
  id?: number;
  role: 'user' | 'agent';
  content: string;
  createdAt?: string;
}

/**
 * AI 对话响应
 */
export interface ChatResponse {
  text: string;
  tokensUsed: number;
  isDegraded: boolean;
  degradedReason?: string;
  remainingToken: number;
}

/**
 * 守护灵记忆
 */
export interface AgentMemory {
  id: number;
  user_id: number;
  memory_type: 'game_preference' | 'emotion' | 'habit' | 'relationship' | 'other';
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
  typeName?: string;
}

/**
 * 记忆类型中文标签
 */
export const MEMORY_TYPE_LABELS: Record<string, string> = {
  game_preference: '游戏偏好',
  emotion: '情感状态',
  habit: '生活习惯',
  relationship: '关系变化',
  other: '其他'
};

/**
 * Token 充值套餐
 */
export interface TokenPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  tokens: number;
  icon: string;
  recommended?: boolean;
}

/**
 * 充值套餐列表
 */
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'small',
    name: '小瓶灵力',
    description: '适合日常陪伴，约200-400次对话',
    price: 2,
    tokens: 200000,
    icon: '🧪'
  },
  {
    id: 'medium',
    name: '中瓶灵力',
    description: '适合深度聊天，约600-1200次对话',
    price: 5,
    tokens: 600000,
    icon: '⚗️',
    recommended: true
  },
  {
    id: 'large',
    name: '大瓶灵力',
    description: '适合重度依赖，约1500-3000次对话',
    price: 10,
    tokens: 1500000,
    icon: '💎'
  }
];

/**
 * 对话统计
 */
export interface ChatStats {
  todayTokens: number;
  todayRequests: number;
  totalConversations: number;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  total: number;
  byType: {
    total: number;
    game_preference: number;
    emotion: number;
    habit: number;
    relationship: number;
    other: number;
  };
}

/**
 * 充值记录
 */
export interface PurchaseRecord {
  id: number;
  user_id: number;
  package_id: string;
  amount: number;
  price: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id: string | null;
  created_at: string;
  packageName?: string;
  packageIcon?: string;
}

/**
 * 充值统计
 */
export interface PurchaseStats {
  totalSpent: number;
  totalTokens: number;
  orderCount: number;
  lastPurchaseAt: string | null;
}

/**
 * AI 统计汇总
 */
export interface AIStats {
  chat: ChatStats;
  memory: MemoryStats;
  purchase: {
    totalSpent: number;
    totalTokens: number;
    orderCount: number;
  };
  energy: {
    remaining: number;
    level: 'abundant' | 'low' | 'depleted';
    purchasedBalance: number;
  };
}

/**
 * 经验值获取类型
 */
export type ExpType = 'sign_in' | 'post' | 'like' | 'invite' | 'territory' | 'market';

/**
 * 亲密度获取类型
 */
export type BondType = 'dialogue' | 'task' | 'invite' | 'level_up';

/**
 * 经验值获取行为名称
 */
export const EXP_ACTION_NAMES: Record<ExpType, string> = {
  sign_in: '每日签到',
  post: '发帖/回帖',
  like: '帖子被点赞',
  invite: '邀请好友',
  territory: '领地升级',
  market: '浏览集市',
};
