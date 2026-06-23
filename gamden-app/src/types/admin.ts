/**
 * Admin 后台类型定义 —— 小程序申请管理
 *
 * 与后端 gamden-backend/src/modules/admin/dto/*.ts 严格对齐
 */

import type {
  CertificationType,
  MiniProgramStatus,
} from './mini-program';

// 重新导出，方便消费方单点 import
export type { CertificationType, MiniProgramStatus };

/** 状态分布统计响应 */
export interface StatusDistributionVo {
  distribution: Record<MiniProgramStatus, number>;
  totalUnlocked: number;
  totalLocked: number;
}

/** 转化漏斗响应 */
export interface FunnelVo {
  unlocked: number;
  startedApply: number;
  certified: number;
  deploying: number;
  reviewing: number;
  online: number;
  conversion: {
    unlockedToApply: number;
    applyToCertified: number;
    certifiedToDeploying: number;
    deployingToReviewing: number;
    reviewingToOnline: number;
    unlockedToOnline: number;
  };
}

/** 列表行（基础字段） */
export interface MiniProgramUserListItem {
  userId: string;
  nickname: string;
  phoneMasked: string;
  status: MiniProgramStatus;
  certificationType: CertificationType | null;
  appidMasked: string | null;
  qualificationUnlockedAt: string | null;
  certSubmittedAt: string | null;
  appidSubmittedAt: string | null;
  codeSubmittedAt: string | null;
  onlineAt: string | null;
  createdAt?: string;
}

/** 用户详情（在列表基础上扩展） */
export interface MiniProgramUserDetail extends MiniProgramUserListItem {
  customName: string | null;
  qrCodeUrl: string | null;
  invitedCount: number;
  lastLoginAt: string | null;
}

/** 手动推进状态请求 */
export interface ManualAdvancePayload {
  toStatus: MiniProgramStatus;
  certificationType?: CertificationType;
  remark?: string;
  force?: boolean;
}

/** 发送提醒场景 */
export type ReminderScene =
  | 'mini_program_unlocked'
  | 'mini_program_certified'
  | 'mini_program_online'
  | 'mini_program_stale'
  | 'custom';

/** 发送提醒请求 */
export interface SendReminderPayload {
  scene: ReminderScene;
  title?: string;
  content?: string;
  remark?: string;
}

/** 操作日志条目 */
export interface MiniProgramLogItem {
  id: string;
  actorId: string | null;
  actorName: string | null;
  userId: string;
  userNickname: string | null;
  action: string;
  fromStatus: MiniProgramStatus | null;
  toStatus: MiniProgramStatus | null;
  remark: string | null;
  extra: Record<string, unknown> | null;
  createdAt: string;
}

/** 教程 */
export interface Tutorial {
  id: string;
  stage: 'apply' | 'appid' | 'review' | 'online' | 'general';
  title: string;
  type: 'article' | 'video';
  url: string;
  summary: string;
  coverUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** FAQ */
export interface Faq {
  id: string;
  stage: 'apply' | 'appid' | 'review' | 'online' | 'general';
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 列表查询参数 */
export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  status?: MiniProgramStatus | '';
  certificationType?: CertificationType | '';
  keyword?: string;
  sortBy?: 'createdAt' | 'unlockedAt' | 'onlineAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  unlockedOnly?: boolean;
}

/** 分页响应 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 状态展示信息 */
export const STATUS_LABEL: Record<MiniProgramStatus, string> = {
  not_started: '未开始',
  certifying: '认证中',
  certified: '认证通过',
  deploying: '待部署',
  reviewing: '代码审核中',
  online: '已上线',
};

/** 状态颜色（用于 badge / 漏斗） */
export const STATUS_COLOR: Record<MiniProgramStatus, string> = {
  not_started: '#A89E85',
  certifying: '#E0A87C',
  certified: '#7CB6E0',
  deploying: '#C97CB6',
  reviewing: '#A87CE0',
  online: '#7CC97C',
};

/** 主体类型展示 */
export const CERT_LABEL: Record<CertificationType, string> = {
  individual: '个人主体',
  enterprise: '企业/个体户',
};
