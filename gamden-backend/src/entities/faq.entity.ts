import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * FAQ 适用阶段（与 TutorialStage 一致）
 */
export type FaqStage = 'apply' | 'appid' | 'review' | 'online' | 'general';

/**
 * 常见问题（FAQ）实体
 *
 * 展示在 "我的小程序" 中心页 → 帮助中心 → FAQ 折叠面板
 * V1.0 先做数据库存储 + 后台增删改
 */
@Entity('faqs')
@Index(['stage', 'sortOrder'])
export class Faq extends BaseEntity {
  /** 阶段分类 */
  @Column({
    type: 'enum',
    enum: ['apply', 'appid', 'review', 'online', 'general'],
    default: 'general',
  })
  stage!: FaqStage;

  /** 问题 */
  @Column({ type: 'varchar', length: 256 })
  question!: string;

  /**
   * 答案（纯文本或简单 markdown）
   * V1.0 不做富文本编辑器，运营通过 textarea 填写
   */
  @Column({ type: 'text' })
  answer!: string;

  /** 排序权重（升序） */
  @Column({ type: 'int', default: 1000, name: 'sort_order' })
  sortOrder!: number;

  /** 是否启用 */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;
}
