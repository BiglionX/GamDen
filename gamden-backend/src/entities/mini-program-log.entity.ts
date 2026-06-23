import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import {
  CertificationType,
  MiniProgramStatus,
} from './user-mini-program.entity';

/**
 * 小程序申请操作日志
 *
 * 用途：
 *  - 记录"运营人员手动推进状态 / 发送提醒" 等后台操作
 *  - 记录"用户自助触发的状态流转"（可选项，本期不写入自动状态变更）
 *
 * 字段设计：
 *  - actorId    操作者（admin 用户 ID；系统自动流转时为 null）
 *  - actorName  操作者昵称（冗余存储，避免 join）
 *  - userId     被操作的小程序申请所属用户
 *  - action     操作类型
 *  - fromStatus / toStatus 状态流转
 *  - remark     备注 / 原因
 *  - extra      额外元数据（jsonb）
 */
export type MiniProgramLogAction =
  | 'manual_advance'      // 运营手动推进状态
  | 'send_reminder'       // 运营发送提醒推送
  | 'admin_reset'         // 运营强制重置
  | 'admin_view_detail';  // 运营查看详情（可选）

@Entity('mini_program_logs')
@Index(['userId', 'createdAt'])
@Index(['actorId', 'createdAt'])
export class MiniProgramLog extends BaseEntity {
  /** 操作者 userId（运营人员），系统自动时为 null */
  @Column({ type: 'uuid', nullable: true, name: 'actor_id' })
  actorId!: string | null;

  /** 操作者昵称（运营人员昵称，冗余字段避免 join） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'actor_name' })
  actorName!: string | null;

  /** 被操作的目标用户 */
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /** 目标用户昵称（冗余） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'user_nickname' })
  userNickname!: string | null;

  /** 操作类型 */
  @Column({
    type: 'enum',
    enum: ['manual_advance', 'send_reminder', 'admin_reset', 'admin_view_detail'],
    default: 'manual_advance',
  })
  action!: MiniProgramLogAction;

  /** 流转前状态（manual_advance 时必填） */
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
    nullable: true,
    name: 'from_status',
  })
  fromStatus!: MiniProgramStatus | null;

  /** 流转后状态（manual_advance 时必填） */
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
    nullable: true,
    name: 'to_status',
  })
  toStatus!: MiniProgramStatus | null;

  /** 备注 / 原因 */
  @Column({ type: 'varchar', length: 512, nullable: true })
  remark!: string | null;

  /**
   * 额外元数据（jsonb）
   * - 推送 scene、appid、reminder 内容等
   */
  @Column({ type: 'jsonb', nullable: true })
  extra!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  declare createdAt: Date;

  // 关联
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

/**
 * 手动推进状态 DTO 的入参校验类型
 * （不在 entity 文件中创建类，避免在 service 中引起循环依赖）
 */
export interface ManualAdvancePayload {
  toStatus: MiniProgramStatus;
  certificationType?: CertificationType;
  remark?: string;
}
