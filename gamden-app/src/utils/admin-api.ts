import { http } from './request';
import type { AnyObject } from '@/types/api';
import type {
  Faq,
  FunnelVo,
  ListUsersQuery,
  ManualAdvancePayload,
  MiniProgramLogItem,
  MiniProgramUserDetail,
  MiniProgramUserListItem,
  PaginatedResult,
  SendReminderPayload,
  StatusDistributionVo,
  Tutorial,
} from '@/types/admin';

/**
 * Admin API（小程序申请管理后台）
 *
 * 后端模块：gamden-backend/src/modules/admin
 * 路由前缀：/api/v1/admin
 * 鉴权：所有接口需 role==='admin'
 *
 * 14 个接口：
 *  1.  GET  /mini-program/users              列表
 *  2.  GET  /mini-program/stats/distribution 状态分布
 *  3.  GET  /mini-program/stats/funnel        漏斗
 *  4.  GET  /mini-program/users/:id          详情
 *  5.  POST /mini-program/users/:id/advance  推进状态
 *  6.  POST /mini-program/users/:id/remind   发提醒
 *  7.  GET  /mini-program/users/:id/logs    日志
 *  8.  GET  /tutorials                       教程列表
 *  9.  POST /tutorials                       创建教程
 * 10.  PATCH /tutorials/:id                  更新教程
 * 11.  DELETE /tutorials/:id                 删除教程
 * 12.  GET  /faqs                            FAQ 列表
 * 13.  POST /faqs                            创建 FAQ
 * 14.  PATCH /faqs/:id                       更新 FAQ
 * 15.  DELETE /faqs/:id                      删除 FAQ
 */
export const adminApi = {
  // ---------- 列表 / 统计 ----------

  listUsers(
    query: ListUsersQuery = {},
  ): Promise<PaginatedResult<MiniProgramUserListItem>> {
    const params: AnyObject = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      sortBy: query.sortBy ?? 'createdAt',
      order: query.order ?? 'desc',
    };
    if (query.status) params.status = query.status;
    if (query.certificationType) params.certificationType = query.certificationType;
    if (query.keyword) params.keyword = query.keyword;
    if (query.unlockedOnly) params.unlockedOnly = true;
    return http.get('/admin/mini-program/users', params);
  },

  getStatusDistribution(): Promise<StatusDistributionVo> {
    return http.get<StatusDistributionVo>(
      '/admin/mini-program/stats/distribution',
    );
  },

  getFunnel(): Promise<FunnelVo> {
    return http.get<FunnelVo>('/admin/mini-program/stats/funnel');
  },

  // ---------- 单个用户 ----------

  getUserDetail(userId: string): Promise<MiniProgramUserDetail> {
    return http.get<MiniProgramUserDetail>(`/admin/mini-program/users/${userId}`);
  },

  manualAdvance(
    userId: string,
    payload: ManualAdvancePayload,
  ): Promise<MiniProgramUserDetail> {
    return http.post<MiniProgramUserDetail>(
      `/admin/mini-program/users/${userId}/advance`,
      payload as unknown as AnyObject,
    );
  },

  sendReminder(
    userId: string,
    payload: SendReminderPayload,
  ): Promise<{ ok: true; sent: boolean }> {
    return http.post<{ ok: true; sent: boolean }>(
      `/admin/mini-program/users/${userId}/remind`,
      payload as unknown as AnyObject,
    );
  },

  listUserLogs(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<MiniProgramLogItem>> {
    return http.get<PaginatedResult<MiniProgramLogItem>>(
      `/admin/mini-program/users/${userId}/logs`,
      { page, pageSize },
    );
  },

  // ---------- 教程 ----------

  listTutorials(opts: { stage?: string; includeInactive?: boolean } = {}): Promise<Tutorial[]> {
    const params: AnyObject = {};
    if (opts.stage) params.stage = opts.stage;
    if (opts.includeInactive) params.includeInactive = 'true';
    return http.get<Tutorial[]>('/admin/tutorials', params);
  },

  createTutorial(payload: Partial<Tutorial>): Promise<Tutorial> {
    return http.post<Tutorial>('/admin/tutorials', payload as unknown as AnyObject);
  },

  updateTutorial(id: string, payload: Partial<Tutorial>): Promise<Tutorial> {
    return http.patch<Tutorial>(`/admin/tutorials/${id}`, payload as unknown as AnyObject);
  },

  deleteTutorial(id: string): Promise<{ ok: true }> {
    return http.delete<{ ok: true }>(`/admin/tutorials/${id}`);
  },

  // ---------- FAQ ----------

  listFaqs(opts: { stage?: string; includeInactive?: boolean } = {}): Promise<Faq[]> {
    const params: AnyObject = {};
    if (opts.stage) params.stage = opts.stage;
    if (opts.includeInactive) params.includeInactive = 'true';
    return http.get<Faq[]>('/admin/faqs', params);
  },

  createFaq(payload: Partial<Faq>): Promise<Faq> {
    return http.post<Faq>('/admin/faqs', payload as unknown as AnyObject);
  },

  updateFaq(id: string, payload: Partial<Faq>): Promise<Faq> {
    return http.patch<Faq>(`/admin/faqs/${id}`, payload as unknown as AnyObject);
  },

  deleteFaq(id: string): Promise<{ ok: true }> {
    return http.delete<{ ok: true }>(`/admin/faqs/${id}`);
  },
};
