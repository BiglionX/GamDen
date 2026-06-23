import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ClubPost } from './club-post.entity';

/**
 * 俱乐部 = 一个游戏贴吧
 * 每个俱乐部对应 OpenIM 中的一个群组（V1.0 用本地群组 id 占位）
 */
@Entity('clubs')
@Index('idx_clubs_game', ['gameTag'])
export class Club extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 64, name: 'game_tag' })
  gameTag!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'icon_url' })
  iconUrl!: string | null;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'int', default: 0, name: 'member_count' })
  memberCount!: number;

  @Column({ type: 'int', default: 0, name: 'today_new_posts' })
  todayNewPosts!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => ClubPost, (p: ClubPost) => p.club)
  posts?: ClubPost[];
}
