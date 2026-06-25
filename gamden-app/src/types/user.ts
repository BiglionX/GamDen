/**
 * 用户身份类型
 */
export type UserRole = 'guest' | 'registered' | 'agent';

/**
 * 守护灵类型（V1.0 六选一）
 * - mechanical  机械师 - 理性/秩序
 * - elf         精灵   - 温暖/陪伴
 * - astrologer  占星师 - 深邃/宿命
 * - ranger      游侠   - 自由/冒险
 * - artisan     工匠   - 创造/经营
 * - apostle     使徒   - 信念/守护
 */
export type GuardianType = 'mechanical' | 'elf' | 'astrologer' | 'ranger' | 'artisan' | 'apostle';

/**
 * 用户实体（与后端 User 对齐）
 */
export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  guardianType?: GuardianType;
  /** 当前用户所属领地 ID */
  territoryId?: string;
  /** 邀请码（注册后系统生成） */
  inviteCode?: string;
  /** 金币余额（顶部状态栏展示） */
  coinBalance?: number;
  /** 未读消息数（OpenIM 集成，顶部红点） */
  unreadCount?: number;
  createdAt: number;
}

/**
 * 登录/注册请求参数（手机号 + 短信验证码）
 */
export interface LoginPayload {
  phone: string;
  smsCode: string;
  inviteCode?: string;
  guardianType?: GuardianType;
}
