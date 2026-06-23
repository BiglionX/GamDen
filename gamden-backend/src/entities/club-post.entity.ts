import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Club } from './club.entity';

/**
 * 俱乐部帖子
 */
@Entity('club_posts')
@Index('idx_posts_club', ['clubId'])
@Index('idx_posts_author', ['authorId'])
export class ClubPost extends BaseEntity {
  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId!: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount!: number;

  @Column({ type: 'int', default: 0, name: 'reply_count' })
  replyCount!: number;

  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned!: boolean;

  @ManyToOne(() => Club, (c: Club) => c.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club?: Club;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author?: User;
}
