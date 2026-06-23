/**
 * IM 相关后端 API 封装
 * ----------------------------------------------------------------------
 * 仅做 HTTP 调用层封装，不涉及 SDK。
 * 调用示例：
 *   import { imApi } from '@/utils/im-api';
 *   const res = await imApi.refreshToken();
 */

import { http } from './request';

/** IM token 响应（与 gamden-backend /auth/* + /im/* 响应一致） */
export interface IMTokenInfo {
  imUserId: string;
  imToken: string;
  /** IM token 过期秒数（默认 604800 = 7 天） */
  imExpiresIn: number;
  /** IM token 过期时间戳（秒） */
  imExpireTime: number;
}

/** IM 连接状态响应 */
export interface IMStatusInfo {
  imUserId: string;
  connected: boolean;
}

export const imApi = {
  /**
   * 刷新 IM token（即将过期或已过期时调用）
   * - POST /im/refresh-token
   * - 返回新的 IM token + expireTime
   */
  async refreshToken(): Promise<IMTokenInfo> {
    return http.post<IMTokenInfo>(
      '/im/refresh-token',
      {},
      { silent: true, skipAuthRedirect: true },
    );
  },

  /**
   * 获取 IM 连接状态
   * - POST /im/status
   */
  async getStatus(): Promise<IMStatusInfo> {
    return http.post<IMStatusInfo>('/im/status');
  },

  /**
   * IM 登出（业务登出后调，服务端强制下线）
   * - POST /im/logout
   */
  async logout(): Promise<{ ok: true }> {
    return http.post<{ ok: true }>('/im/logout');
  },

  /**
   * 同步用户信息到 IM（昵称/头像变更后调）
   * - POST /im/sync-user
   */
  async syncUser(): Promise<{ ok: true }> {
    return http.post<{ ok: true }>('/im/sync-user');
  },
};

export default imApi;