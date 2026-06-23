import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 邀请码状态：
 * - active   有效，未使用
 * - used     已被某用户使用
 * - revoked  主动作废
 */
export type InviteStatus = 'active' | 'used' | 'revoked';

@Entity('invites')
@Index('uq_invites_code', ['code'], { unique: true })
export class Invite extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'uuid', name: 'inviter_id' })
  inviterId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'invitee_id' })
  inviteeId!: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'used', 'revoked'],
    default: 'active',
  })
  status!: InviteStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt!: Date | null;

  @ManyToOne(() => User, (u: User) => u.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviter_id' })
  inviter?: User;
}
