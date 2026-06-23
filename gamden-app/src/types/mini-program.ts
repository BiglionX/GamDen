/**
 * 用户自主小程序申请与部署 —— 前端类型定义
 *
 * 与后端 gamden-backend/src/entities/user-mini-program.entity.ts 严格对齐
 * 修改任一处需同步另一处
 *
 * 生命周期状态流转（单向）：
 *   not_started → certifying → certified → deploying → reviewing → online
 */

/** 申请状态枚举 */
export type MiniProgramStatus =
  | 'not_started'
  | 'certifying'
  | 'certified'
  | 'deploying'
  | 'reviewing'
  | 'online';

/** 认证主体类型 */
export type CertificationType = 'individual' | 'enterprise';

/**
 * 用户小程序申请记录（GET /api/v1/mini-program/status 响应）
 * - 注意：appSecret 字段不会回传（后端 select: false）
 */
export interface UserMiniProgram {
  id: string;
  /** 关联用户 ID */
  userId: string;
  /** 当前申请状态 */
  status: MiniProgramStatus;
  /** 认证主体类型，未提交前为 null */
  certificationType: CertificationType | null;
  /** 用户填写的微信小程序 AppID */
  appid: string | null;
  /** 用户自定义的小程序名称（展示用） */
  customName: string | null;
  /** 获得部署资格的时间（邀请达标） */
  qualificationUnlockedAt: string | null;
  /** 用户确认已提交微信认证的时间 */
  certSubmittedAt: string | null;
  /** 用户提交 AppID 的时间 */
  appidSubmittedAt: string | null;
  /** 平台提交代码审核的时间 */
  codeSubmittedAt: string | null;
  /** 小程序上线时间 */
  onlineAt: string | null;
  /** 小程序码图片 URL（上线后才有） */
  qrCodeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 开始申请 DTO */
export interface ApplyDto {
  certificationType: CertificationType;
}

/** 提交 AppID DTO */
export interface SubmitAppidDto {
  appid: string;
  appSecret: string;
}

/** 教程条目（GET /tutorials） */
export interface TutorialItem {
  id: string;
  title: string;
  type: 'article' | 'video';
  url: string;
  summary: string;
}

/** 状态机显示配置（用于 UI 展示） */
export interface StatusDisplay {
  /** 中文标签 */
  label: string;
  /** 描述 */
  description: string;
  /** 徽章色系 */
  color: 'gray' | 'yellow' | 'blue' | 'purple' | 'green';
  /** 进度 current/total */
  progress: { current: number; total: number };
  /** 步骤序号（1 起） */
  step: number;
  /** 用户可执行的动作提示（null 表示无需操作） */
  actionHint: string | null;
}

/**
 * 状态机的显示元数据（前端单点维护，便于 UI 集中修改）
 * - 4 步：申请 → 认证 → 部署 → 上线
 */
export const STATUS_DISPLAY: Record<MiniProgramStatus, StatusDisplay> = {
  not_started: {
    label: '尚未申请',
    description: '请提交材料开始你的小程序申请',
    color: 'gray',
    progress: { current: 0, total: 4 },
    step: 1,
    actionHint: '前往微信完成小程序认证',
  },
  certifying: {
    label: '认证中',
    description: '等待微信审核（1-3 个工作日）',
    color: 'yellow',
    progress: { current: 1, total: 4 },
    step: 2,
    actionHint: null,
  },
  certified: {
    label: '认证通过',
    description: '请提交 AppID 完成部署',
    color: 'blue',
    progress: { current: 2, total: 4 },
    step: 3,
    actionHint: '填写小程序 AppID',
  },
  deploying: {
    label: '待部署',
    description: '正在提交代码到微信',
    color: 'purple',
    progress: { current: 2, total: 4 },
    step: 4,
    actionHint: null,
  },
  reviewing: {
    label: '代码审核中',
    description: '等待微信审核（1-7 个工作日）',
    color: 'yellow',
    progress: { current: 3, total: 4 },
    step: 4,
    actionHint: null,
  },
  online: {
    label: '已上线',
    description: '你的小程序已正式发布',
    color: 'green',
    progress: { current: 4, total: 4 },
    step: 4,
    actionHint: null,
  },
};

/** 状态机的合法下一状态（与后端 ALLOWED_TRANSITIONS 对齐） */
export const ALLOWED_NEXT_STATUSES: Readonly<
  Record<MiniProgramStatus, readonly MiniProgramStatus[]>
> = {
  not_started: ['certifying'],
  certifying: ['certified'],
  certified: ['deploying'],
  deploying: ['reviewing'],
  reviewing: ['online'],
  online: [],
};

/** 状态流转顺序（用于渲染进度条） */
export const MINI_PROGRAM_STATUS_FLOW: readonly MiniProgramStatus[] = [
  'not_started',
  'certifying',
  'certified',
  'reviewing',
  'online',
] as const;

/** 认证主体类型展示标签 */
export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  individual: '个人主体',
  enterprise: '企业 / 个体工商户',
};

/**
 * 计算当前状态对应的进度百分比（0-100）
 */
export function getMiniProgramProgress(status: MiniProgramStatus): number {
  const flow: readonly MiniProgramStatus[] = [
    'not_started',
    'certifying',
    'certified',
    'reviewing',
    'online',
  ];
  const idx = flow.indexOf(status);
  if (idx < 0) return 0;
  const total = flow.length - 1;
  return Math.round((idx / total) * 100);
}

/**
 * AppID 格式校验（与后端 APPID_REGEX 一致）
 */
export function isValidAppId(appid: string): boolean {
  return /^wx[0-9a-f]{16}$/i.test(appid);
}

/**
 * AppSecret 格式校验（与后端一致，至少 16 位）
 */
export function isValidAppSecret(secret: string): boolean {
  return !!secret && secret.length >= 16;
}
