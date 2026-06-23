import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 领地等级 1-5：
 *  1 🌱 树苗
 *  2 🌿 小树林
 *  3 🏡 木屋
 *  4 🏘️ 石屋群
 *  5 🏯 小型寨落
 */
export type TerritoryLevel = 1 | 2 | 3 | 4 | 5;

@Entity('territories')
@Unique('uq_territories_user', ['userId'])
@Index('idx_territories_coord', ['coordX', 'coordY'])
export class Territory extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'int', name: 'coord_x' })
  coordX!: number;

  @Column({ type: 'int', name: 'coord_y' })
  coordY!: number;

  @Column({ type: 'smallint', default: 1 })
  level!: TerritoryLevel;

  @Column({ type: 'int', default: 0 })
  exp!: number;

  @Column({ type: 'int', default: 0, name: 'next_level_exp' })
  nextLevelExp!: number;

  @OneToOne(() => User, (u: User) => u.territory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
