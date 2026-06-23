import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 用户自主小程序申请状态（生命周期单向流转）：
 * - not_started  未开始（刚获得资格，邀请达标后自动创建记录）
 * - certifying   认证中（用户已前往微信完成小程序认证提交）
 * - certified    认证通过（认证完成，等待用户提交 AppID）
 * - deploying    待部署（已认证，需用户提交 AppID 后触发代码部署）
 * - reviewing    代码审核中（平台已提交代码，等待微信审核）
 * - online       已上线（审核通过，小程序已发布）
 *
 * 流转顺序：
 *   not_started → certifying → certified → deploying → reviewing → online
 */
export type MiniProgramStatus =
  | 'not_started'
  | 'certifying'
  | 'certified'
  | 'deploying'
  | 'reviewing'
  | 'online';

/**
 * 微信小程序认证主体类型：
 * - individual   个人主体
 * - enterprise   企业 / 个体工商户
 */
export type CertificationType = 'individual' | 'enterprise';

/**
 * 用户自主小程序申请与部署记录
 *
 * 每个用户至多一条记录（user_id 唯一）。
 * 当用户邀请人数达到阈值（默认 ≥3）后，系统自动创建该记录，
 * status 初始为 not_started，随后按生命周期流转。
 */
@Entity('user_mini_programs')
@Unique('uq_user_mini_programs_user', ['userId'])
export class UserMiniProgram extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /**
   * 当前申请状态，默认 not_started
   */
  @Column({
    type: 'enum',
    enum: [
      'not_started',
      'certifying',
      'certified',
      'deploying',
      'reviewing',
      'online',
    ],
    default: 'not_started',
  })
  status!: MiniProgramStatus;

  /**
   * 认证主体类型（用户在 certifying 阶段选择），未提交前为 null
   */
  @Column({
    type: 'enum',
    enum: ['individual', 'enterprise'],
    nullable: true,
    name: 'certification_type',
  })
  certificationType!: CertificationType | null;

  /**
   * 用户填写的微信小程序 AppID（deploying 阶段提交）
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  appid!: string | null;

  /**
   * 用户填写的微信小程序 AppSecret（敏感信息）
   * - 仅在用户提交 AppID 时记录，用于后续调用微信 API（小程序码、审核状态等）
   * - 生产环境必须使用 KMS/加密字段存储（V1.0 明文存储，后续升级加密）
   * - 任何对外响应都不应回传此字段
   */
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'app_secret', select: false })
  appSecret!: string | null;

  /**
   * 用户自定义的小程序名称（展示用，非微信侧注册名）
   */
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'custom_name' })
  customName!: string | null;

  /**
   * 获得部署资格的时间（邀请达标时写入）
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'qualification_unlocked_at',
  })
  qualificationUnlockedAt!: Date | null;

  /**
   * 用户确认已提交微信认证的时间（进入 certifying）
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'cert_submitted_at',
  })
  certSubmittedAt!: Date | null;

  /**
   * 用户提交 AppID 的时间（进入 deploying）
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'appid_submitted_at',
  })
  appidSubmittedAt!: Date | null;

  /**
   * 平台提交代码审核的时间（进入 reviewing）
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'code_submitted_at',
  })
  codeSubmittedAt!: Date | null;

  /**
   * 小程序上线时间（进入 online）
   */
  @Column({ type: 'timestamptz', nullable: true, name: 'online_at' })
  onlineAt!: Date | null;

  /**
   * 小程序码图片 URL（上线后生成，用于海报 / 分享）
   */
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'qr_code_url' })
  qrCodeUrl!: string | null;

  // 关联：1 用户对 1 小程序申请记录
  @OneToOne(() => User, (u: User) => u.userMiniProgram, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
