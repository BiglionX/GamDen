import { http } from './request';
import type {
  InviteStats,
  InviteeItem,
  InvitePosterData,
  MiniProgramCodeData,
} from '@/types/invite';

/**
 * 邀请裂变 API
 * 后端模块：gamden-backend/src/modules/invite
 */
export const inviteApi = {
  /** 我的邀请码 + 进度 */
  async getMyInvite(): Promise<{
    code: string;
    status: 'active' | 'used' | 'revoked';
    invitedCount: number;
    inviteGoal: number;
    expiresAt: string | null;
  }> {
    return http.get('/invites/me');
  },

  /** 详细邀请统计 */
  async getStats(): Promise<InviteStats> {
    return http.get('/invites/stats');
  },

  /** 被邀请人列表 */
  async getInvitees(limit = 50): Promise<InviteeItem[]> {
    return http.get('/invitees', { limit });
  },

  /** 邀请海报元数据 */
  async getPosterData(): Promise<InvitePosterData> {
    return http.get('/invites/poster');
  },

  /** 个人专属小程序码 */
  async getMiniProgramCode(): Promise<MiniProgramCodeData> {
    return http.get('/invites/mini-program-code');
  },
};
