import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 教程类型
 * - article 图文/文章
 * - video  视频
 */
export type TutorialType = 'article' | 'video';

/**
 * 教程适用阶段
 * - apply    注册小程序账号 / 提交认证
 * - appid    获取 AppID / AppSecret
 * - review   代码审核
 * - online   发布上线
 * - general  通用教程（任意阶段可见）
 */
export type TutorialStage =
  | 'apply'
  | 'appid'
  | 'review'
  | 'online'
  | 'general';

/**
 * 教程实体（管理端可增删改）
 *
 * V1.0 mini-program.service.ts 中 getTutorials() 返回的是静态数组，
 * 引入本实体后，Service 将改为读取数据库，并保留静态数据作为种子 fallback。
 */
@Entity('tutorials')
@Index(['stage', 'sortOrder'])
export class Tutorial extends BaseEntity {
  /** 阶段分类（决定前端在哪个 Tab 展示） */
  @Column({
    type: 'enum',
    enum: ['apply', 'appid', 'review', 'online', 'general'],
    default: 'general',
  })
  stage!: TutorialStage;

  /** 教程标题 */
  @Column({ type: 'varchar', length: 128 })
  title!: string;

  /** 教程类型 */
  @Column({
    type: 'enum',
    enum: ['article', 'video'],
    default: 'article',
  })
  type!: TutorialType;

  /** 跳转 URL（外链文章 / 视频 / H5） */
  @Column({ type: 'varchar', length: 512 })
  url!: string;

  /** 简介（用于列表卡片副标题） */
  @Column({ type: 'varchar', length: 256, default: '' })
  summary!: string;

  /** 缩略图（可选，用于卡片封面） */
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'cover_url' })
  coverUrl!: string | null;

  /**
   * 排序权重（升序展示）
   * - 默认 1000，允许运营侧通过调整此值控制列表顺序
   */
  @Column({ type: 'int', default: 1000, name: 'sort_order' })
  sortOrder!: number;

  /**
   * 是否启用
   * - 停用后前端 getTutorials 不再返回
   */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;
}
