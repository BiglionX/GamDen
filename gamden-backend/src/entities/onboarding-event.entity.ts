import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * 入驻流程事件记录实体
 *
 * 用于记录用户在入驻引导全流程中的关键节点事件，
 * 支持分析用户流失节点和优化入驻流程。
 */
@Entity('onboarding_events')
@Index(['userId', 'createdAt'])
export class OnboardingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 用户 ID */
  @Column({ type: 'varchar', length: 64 })
  @Index()
  userId: string;

  /** 事件名称 */
  @Column({ type: 'varchar', length: 64 })
  event: string;

  /** 事件属性（JSON） */
  @Column({ type: 'json', nullable: true })
  properties: Record<string, any>;

  /** 事件发生时间 */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}

/**
 * 入驻流程事件类型枚举
 */
export enum OnboardingEventType {
  /** 软引导气泡弹出 */
  GUIDE_BUBBLE_SHOWN = 'onboarding_guide_bubble_shown',
  /** 用户点击软引导气泡 */
  GUIDE_CLICKED = 'onboarding_guide_clicked',
  /** 用户进入注册页 */
  REGISTER_STARTED = 'onboarding_register_started',
  /** 用户完成守护灵选择 */
  GUARDIAN_SELECTED = 'onboarding_guardian_selected',
  /** 领地分配完成 */
  TERRITORY_LANDED = 'onboarding_territory_landed',
  /** 用户完成新手任务 */
  TASK_COMPLETED = 'onboarding_completed',
  /** 入驻流程完成 */
  ONBOARDING_COMPLETED = 'onboarding_completed',
}
