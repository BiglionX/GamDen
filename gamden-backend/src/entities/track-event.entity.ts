import {
  Column,
  Entity,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 埋点事件表
 *
 * V1.0 用途：
 *  - 小程序申请全流程的关键行为埋点（mp_qualification_unlocked / mp_apply_start 等）
 *  - 用户行为分析、转化漏斗、产品决策依据
 *
 * 设计原则：
 *  - 单表设计：event_name + properties (jsonb) 灵活扩展
 *  - user_id 可空：游客态也能埋点（仅靠 device_id 关联）
 *  - device_id 必有：跨设备/跨登录态的关联标识
 *  - 后续可按月分区 / 同步到 ClickHouse / 数仓
 */
@Entity('track_events')
@Index('idx_track_events_user_id_created_at', ['userId', 'createdAt'])
@Index('idx_track_events_event_name_created_at', ['eventName', 'createdAt'])
@Index('idx_track_events_device_id_created_at', ['deviceId', 'createdAt'])
export class TrackEvent extends BaseEntity {
  /** 事件名（如 mp_qualification_unlocked） */
  @Column({ type: 'varchar', length: 64, name: 'event_name' })
  eventName!: string;

  /** 用户 ID（登录态有，游客态 null） */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null;

  /** 设备 ID（来自 X-Device-ID header，跨登录态稳定） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'device_id' })
  deviceId!: string | null;

  /** 业务附加字段（jsonb，结构随 event_name 不同） */
  @Column({ type: 'jsonb', nullable: true })
  properties!: Record<string, unknown> | null;

  /** 当前页面路径（前端透传） */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'page_url' })
  pageUrl!: string | null;

  /** 客户端平台（H5 / mp-weixin / app-plus） */
  @Column({ type: 'varchar', length: 32, nullable: true })
  platform!: string | null;

  /** 客户端 IP（服务端捕获） */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  /** User-Agent（服务端捕获） */
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent!: string | null;
}
