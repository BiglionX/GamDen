import { Column, Entity, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Territory } from './territory.entity';
import { Invite } from './invite.entity';
import { UserMiniProgram } from './user-mini-program.entity';

/**
 * 用户角色：
 * - guest      游客（未注册或未登录）
 * - registered 注册用户
 * - agent      代理/运营
 * - admin      管理员
 */
export type UserRole = 'guest' | 'registered' | 'agent' | 'admin';

/**
 * 守护灵类型（V1.0 三选一）
 */
export type GuardianType = 'mechanical' | 'elf' | 'astrologer';

@Entity('users')
@Index(['phone'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  nickname!: string;

  /**
   * 手机号 - V1.0 唯一认证凭据
   * - 不可为空
   * - 唯一索引
   */
  @Column({ type: 'varchar', length: 32, name: 'phone' })
  phone!: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'avatar_url' })
  avatarUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ['guest', 'registered', 'agent', 'admin'],
    default: 'registered',
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: ['mechanical', 'elf', 'astrologer'],
    nullable: true,
    name: 'guardian_type',
  })
  guardianType!: GuardianType | null;

  @Column({ type: 'int', default: 0, name: 'coin_balance' })
  coinBalance!: number;

  @Column({ type: 'int', default: 0, name: 'invited_count' })
  invitedCount!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt!: Date | null;

  /**
   * 推送 token 列表（uni-push 个推 CID）
   * - 多端登录：每端一个 token
   * - jsonb 存储，V1.0 mock 不强制写入
   * - V1.1+ 由前端 uni.getPushClientId() 获取后通过 API 上报
   */
  @Column({ type: 'jsonb', nullable: true, name: 'push_tokens', default: () => "'[]'" })
  pushTokens!: string[] | null;

  /**
   * 推送开关（用户可关闭推送）
   * - V1.0 默认开启；用户在"设置"页可关闭
   */
  @Column({ type: 'boolean', default: true, name: 'push_enabled' })
  pushEnabled!: boolean;

  // 关联：1 用户对 1 领地
  @OneToOne(() => Territory, (t: Territory) => t.user)
  territory?: Territory;

  // 关联：1 用户发出 N 个邀请码
  @OneToMany(() => Invite, (i: Invite) => i.inviter)
  invites?: Invite[];

  // 关联：1 用户对 1 自主小程序申请记录
  @OneToOne(() => UserMiniProgram, (m: UserMiniProgram) => m.user)
  userMiniProgram?: UserMiniProgram;
}
