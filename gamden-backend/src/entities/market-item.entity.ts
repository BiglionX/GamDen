import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 集市道具
 * V1.0 仅支持金币兑换虚拟道具（头像框 / 领地装饰 / 加速券）
 */
export type ItemCategory = 'avatar' | 'deco' | 'boost';

@Entity('market_items')
@Index('idx_items_category', ['category'])
export class MarketItem extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: ItemCategory;

  @Column({ type: 'varchar', length: 16, name: 'icon_emoji' })
  iconEmoji!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ type: 'int' })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'int', default: 0, name: 'sold_count' })
  soldCount!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;
}
