import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 领地解锁记录表
 * - 用户每次升级（包含 Lv.1 注册默认解锁）写入一条记录
 * - 用于：
 *   1. 历史追溯（用户什么时候升到 Lv.3）
 *   2. 资源加载（前端根据解锁历史显示对应等级的图标/特效）
 *   3. 排行榜（最近一周有多少玩家升到 Lv.5）
 */
@Entity('territory_evolutions')
@Unique('uq_evolution_user_level', ['userId', 'level'])
@Index('idx_evolution_user', ['userId'])
export class TerritoryEvolution extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /** 解锁的等级 1-5 */
  @Column({ type: 'smallint' })
  level!: 1 | 2 | 3 | 4 | 5;

  /** 该等级对应的图标资源 URL（emoji / png / lottie 均可） */
  @Column({ type: 'varchar', length: 512, name: 'icon_url' })
  iconUrl!: string;

  /** 解锁时刻（冗余字段便于直接查询排序） */
  @Column({ type: 'timestamptz', name: 'unlocked_at' })
  unlockedAt!: Date;

  /** 解锁来源：register=注册默认 / signin=签到 / post=发帖 / invite=邀请好友 / upgrade=普通升级 */
  @Column({
    type: 'enum',
    enum: ['register', 'signin', 'post', 'invite', 'upgrade'],
    default: 'upgrade',
    name: 'unlock_source',
  })
  unlockSource!: 'register' | 'signin' | 'post' | 'invite' | 'upgrade';

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
