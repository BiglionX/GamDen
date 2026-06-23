/**
 * 邀请统计（与后端 InviteStats 对齐）
 */
export interface InviteStats {
  code: string;
  totalInvited: number;
  todayInvited: number;
  weekInvited: number;
  unlockThreshold: number;
  unlockedMiniProgram: boolean;
  expiresAt: string | null;
}

/**
 * 被邀请人条目
 */
export interface InviteeItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  guardianType: string | null;
  invitedAt: string;
}

/**
 * 邀请海报元数据（前端 Canvas 渲染用）
 */
export interface InvitePosterData {
  nickname: string;
  guardianType: string | null;
  inviteCode: string;
  inviteUrl: string;
  totalInvited: number;
  /** base64 形式的二维码图片 */
  qrCodeDataUrl: string;
}

/**
 * 个人小程序码（≥3 人解锁）
 */
export interface MiniProgramCodeData {
  unlocked: boolean;
  invitedCount: number;
  threshold: number;
  /** 解锁后才有 */
  imageBase64?: string;
  scene?: string;
  pagePath?: string;
  expiresAt?: string;
}

/**
 * 海报渲染配置
 */
export interface PosterRenderConfig {
  /** 海报宽度（px） */
  width: number;
  /** 海报高度（px） */
  height: number;
  /** 背景色 */
  background: string;
  /** 主题色（古风金） */
  primary: string;
  /** 文字主色 */
  textPrimary: string;
  /** 文字次色 */
  textSecondary: string;
}

export const DEFAULT_POSTER_CONFIG: PosterRenderConfig = {
  width: 750,
  height: 1200,
  background: '#1e241f',
  primary: '#c9a87c',
  textPrimary: '#f5f0e6',
  textSecondary: '#a89e85',
};
