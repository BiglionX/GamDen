/**
 * 俱乐部API模块
 * 提供俱乐部相关的所有API调用
 */

import { http } from './request';
import type {
  ClubUpgrade,
  ClubMemberUpgrade,
  ClubProposal,
  ClubType,
  ProposalStatus,
} from '@/types/club';

// ============================================
// 俱乐部列表与详情
// ============================================

/** 俱乐部列表参数 */
export interface ClubListParams {
  page?: number;
  limit?: number;
  club_type?: ClubType;
  tags?: string[];
  keyword?: string;
  vitality_level?: string;
  sort_by?: 'vitality' | 'member_count' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/** 俱乐部列表响应 */
export interface ClubListResponse {
  clubs: ClubUpgrade[];
  total: number;
}

/**
 * 获取俱乐部列表（扩展版）
 */
export const getClubList = (params?: ClubListParams): Promise<ClubListResponse> => {
  const queryParams = new URLSearchParams();
  if (params) {
    const { page, limit, club_type, tags, keyword, vitality_level, sort_by, sort_order } = params;
    if (page) queryParams.set('page', String(page));
    if (limit) queryParams.set('limit', String(limit));
    if (club_type) queryParams.set('club_type', club_type);
    if (tags && tags.length > 0) queryParams.set('tags', tags.join(','));
    if (keyword) queryParams.set('keyword', keyword);
    if (vitality_level) queryParams.set('vitality_level', vitality_level);
    if (sort_by) queryParams.set('sort_by', sort_by);
    if (sort_order) queryParams.set('sort_order', sort_order);
  }
  return http.get<ClubListResponse>(`/club/list/extended?${queryParams.toString()}`);
};

/**
 * 获取俱乐部详情
 */
export const getClubDetail = (clubId: number): Promise<ClubUpgrade> => {
  return http.get<ClubUpgrade>(`/club/${clubId}`);
};

// ============================================
// 俱乐部加入/退出
// ============================================

/**
 * 加入俱乐部
 */
export const joinClub = (clubId: number): Promise<{ success: boolean; message: string }> => {
  return http.post<{ success: boolean; message: string }>(`/club/join/${clubId}`, {});
};

/**
 * 退出俱乐部
 */
export const leaveClub = (clubId: number): Promise<{ success: boolean; message: string }> => {
  return http.post<{ success: boolean; message: string }>(`/club/leave/${clubId}`, {});
};

/**
 * 检查用户是否是俱乐部成员
 */
export const checkClubMembership = (clubId: number): Promise<{ is_member: boolean }> => {
  return http.get<{ is_member: boolean }>(`/club/user/membership/${clubId}`);
};

// ============================================
// 用户俱乐部
// ============================================

/**
 * 获取用户已加入的俱乐部列表
 */
export const getUserClubs = (): Promise<ClubUpgrade[]> => {
  return http.get<ClubUpgrade[]>('/club/user/clubs');
};

/**
 * 获取推荐俱乐部
 */
export const getRecommendedClubs = (limit?: number): Promise<ClubUpgrade[]> => {
  const params = limit ? `?limit=${limit}` : '';
  return http.get<ClubUpgrade[]>(`/club/user/recommended${params}`);
};

/**
 * 自动加入默认俱乐部（新用户入驻）
 */
export const autoJoinDefault = (): Promise<{ club_id: number; group_id: string } | null> => {
  return http.post<{ club_id: number; group_id: string } | null>('/club/user/auto-join', {});
};

// ============================================
// 俱乐部成员
// ============================================

/** 成员列表参数 */
export interface MemberListParams {
  page?: number;
  limit?: number;
}

/** 成员列表响应 */
export interface MemberListResponse {
  members: ClubMemberUpgrade[];
  total: number;
}

/**
 * 获取俱乐部成员列表
 */
export const getClubMembers = (clubId: number, params?: MemberListParams): Promise<MemberListResponse> => {
  const queryParams = new URLSearchParams();
  if (params) {
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
  }
  return http.get<MemberListResponse>(`/club/${clubId}/members?${queryParams.toString()}`);
};

// ============================================
// 俱乐部提议
// ============================================

/** 提议列表参数 */
export interface ProposalListParams {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  proposal_type?: string;
}

/** 提议列表响应 */
export interface ProposalListResponse {
  proposals: ClubProposal[];
  total: number;
}

/**
 * 创建俱乐部提议
 */
export const createProposal = (data: {
  name: string;
  description: string;
  proposal_type?: string;
  game_name?: string;
  tags?: string[];
}): Promise<{ proposal_id: number }> => {
  return http.post<{ proposal_id: number }>('/club/proposals', data);
};

/**
 * 获取提议列表
 */
export const getProposalList = (params?: ProposalListParams): Promise<ProposalListResponse> => {
  const queryParams = new URLSearchParams();
  if (params) {
    const { page, limit, status, proposal_type } = params;
    if (page) queryParams.set('page', String(page));
    if (limit) queryParams.set('limit', String(limit));
    if (status) queryParams.set('status', status);
    if (proposal_type) queryParams.set('proposal_type', proposal_type);
  }
  return http.get<ProposalListResponse>(`/club/proposals?${queryParams.toString()}`);
};

/**
 * 获取提议详情
 */
export const getProposalDetail = (proposalId: number): Promise<ClubProposal> => {
  return http.get<ClubProposal>(`/club/proposals/${proposalId}`);
};

/**
 * 联署提议
 */
export const endorseProposal = (proposalId: number): Promise<{
  success: boolean;
  endorsement_count: number;
  auto_approved: boolean;
}> => {
  return http.post<{
    success: boolean;
    endorsement_count: number;
    auto_approved: boolean;
  }>(`/club/proposals/${proposalId}/endorse`, {});
};

// ============================================
// 活力值
// ============================================

/**
 * 获取活力值排行榜
 */
export const getVitalityRanking = (limit?: number): Promise<ClubUpgrade[]> => {
  const params = limit ? `?limit=${limit}` : '';
  return http.get<ClubUpgrade[]>(`/club/vitality/ranking${params}`);
};

// ============================================
// 导出API对象
// ============================================

export const clubApi = {
  // 俱乐部列表与详情
  getClubList,
  getClubDetail,
  // 加入/退出
  joinClub,
  leaveClub,
  checkClubMembership,
  // 用户俱乐部
  getUserClubs,
  getRecommendedClubs,
  autoJoinDefault,
  // 成员
  getClubMembers,
  // 提议
  createProposal,
  getProposalList,
  getProposalDetail,
  endorseProposal,
  // 活力值
  getVitalityRanking,
};
