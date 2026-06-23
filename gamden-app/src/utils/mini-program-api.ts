import { http } from './request';
import type { AnyObject } from '@/types/api';
import type {
  UserMiniProgram,
  ApplyDto,
  SubmitAppidDto,
  TutorialItem,
} from '@/types/mini-program';

/**
 * 用户自主小程序 API
 * 后端模块：gamden-backend/src/modules/mini-program
 * 路由前缀：/api/v1/mini-program
 *
 * 7 个接口：
 *  1. GET    /status           获取申请状态
 *  2. POST   /apply            开始申请
 *  3. POST   /appid            提交 AppID
 *  4. POST   /confirm-reviewing 确认代码审核中
 *  5. POST   /confirm-online   确认已上线
 *  6. POST   /abandon          放弃申请
 *  7. GET    /tutorials        教程列表
 */
export const miniProgramApi = {
  /**
   * 获取当前用户的申请状态
   * - 未解锁资格时返回 null
   */
  async getStatus(): Promise<UserMiniProgram | null> {
    return http.get<UserMiniProgram | null>('/mini-program/status');
  },

  /**
   * 用户开始申请（选择认证主体类型）
   * - 状态: not_started → certifying
   */
  async apply(dto: ApplyDto): Promise<UserMiniProgram> {
    const body: AnyObject = {
      certificationType: dto.certificationType,
    };
    return http.post<UserMiniProgram>('/mini-program/apply', body);
  },

  /**
   * 提交 AppID + AppSecret
   * - 状态: certified → deploying
   * - 后端会调用微信 API 实时校验 AppID 有效性
   */
  async submitAppid(dto: SubmitAppidDto): Promise<UserMiniProgram> {
    const body: AnyObject = {
      appid: dto.appid,
      appSecret: dto.appSecret,
    };
    return http.post<UserMiniProgram>('/mini-program/appid', body);
  },

  /**
   * 确认代码已提交审核
   * - 状态: deploying → reviewing
   */
  async confirmReviewing(): Promise<UserMiniProgram> {
    return http.post<UserMiniProgram>('/mini-program/confirm-reviewing');
  },

  /**
   * 确认小程序已上线（生成小程序码）
   * - 状态: reviewing → online
   */
  async confirmOnline(): Promise<UserMiniProgram> {
    return http.post<UserMiniProgram>('/mini-program/confirm-online');
  },

  /**
   * 用户放弃申请（重置状态）
   * - 任意非 online 状态 → not_started
   */
  async abandon(): Promise<UserMiniProgram> {
    return http.post<UserMiniProgram>('/mini-program/abandon');
  },

  /**
   * 获取教程列表（公开）
   */
  async getTutorials(): Promise<TutorialItem[]> {
    return http.get<TutorialItem[]>('/mini-program/tutorials');
  },
};
