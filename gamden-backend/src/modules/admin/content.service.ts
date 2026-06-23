import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Tutorial } from '../../entities/tutorial.entity';
import { Faq } from '../../entities/faq.entity';
import {
  CreateFaqDto,
  CreateTutorialDto,
  UpdateFaqDto,
  UpdateTutorialDto,
} from './dto/content.dto';

/**
 * 教程/FAQ 内容管理 Service
 *
 * - 教程用于前端 getTutorials（替代 MiniProgramService.getTutorials 静态数据）
 * - FAQ 用于前端"帮助中心"折叠面板
 *
 * 设计原则：
 *  - 增删改查直接对 DB，无缓存
 *  - isActive=false 的不返回给前端
 *  - 排序按 sortOrder ASC, id ASC
 */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(Tutorial)
    private readonly tutorialRepo: Repository<Tutorial>,
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
  ) {}

  // ======================== 教程 ========================

  async listTutorials(params: { stage?: string; includeInactive?: boolean }) {
    const qb = this.tutorialRepo.createQueryBuilder('t');
    if (params.stage) {
      qb.andWhere('t.stage = :stage', { stage: params.stage });
    }
    if (!params.includeInactive) {
      qb.andWhere('t.is_active = :active', { active: true });
    }
    qb.orderBy('t.sort_order', 'ASC').addOrderBy('t.id', 'ASC');
    return qb.getMany();
  }

  async getTutorial(id: string): Promise<Tutorial> {
    const t = await this.tutorialRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('教程不存在');
    return t;
  }

  async createTutorial(dto: CreateTutorialDto): Promise<Tutorial> {
    const t = this.tutorialRepo.create({
      stage: dto.stage,
      title: dto.title,
      type: dto.type,
      url: dto.url,
      summary: dto.summary ?? '',
      coverUrl: dto.coverUrl ?? null,
      sortOrder: dto.sortOrder ?? 1000,
      isActive: dto.isActive ?? true,
    });
    return this.tutorialRepo.save(t);
  }

  async updateTutorial(id: string, dto: UpdateTutorialDto): Promise<Tutorial> {
    const t = await this.getTutorial(id);
    if (dto.stage !== undefined) t.stage = dto.stage;
    if (dto.title !== undefined) t.title = dto.title;
    if (dto.type !== undefined) t.type = dto.type;
    if (dto.url !== undefined) t.url = dto.url;
    if (dto.summary !== undefined) t.summary = dto.summary;
    if (dto.coverUrl !== undefined) t.coverUrl = dto.coverUrl;
    if (dto.sortOrder !== undefined) t.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) t.isActive = dto.isActive;
    return this.tutorialRepo.save(t);
  }

  async deleteTutorial(id: string): Promise<{ ok: true }> {
    const t = await this.getTutorial(id);
    await this.tutorialRepo.remove(t);
    this.logger.log(`删除教程 id=${id} title="${t.title}"`);
    return { ok: true };
  }

  // ======================== FAQ ========================

  async listFaqs(params: { stage?: string; includeInactive?: boolean }) {
    const qb = this.faqRepo.createQueryBuilder('f');
    if (params.stage) {
      qb.andWhere('f.stage = :stage', { stage: params.stage });
    }
    if (!params.includeInactive) {
      qb.andWhere('f.is_active = :active', { active: true });
    }
    qb.orderBy('f.sort_order', 'ASC').addOrderBy('f.id', 'ASC');
    return qb.getMany();
  }

  async getFaq(id: string): Promise<Faq> {
    const f = await this.faqRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('FAQ 不存在');
    return f;
  }

  async createFaq(dto: CreateFaqDto): Promise<Faq> {
    const f = this.faqRepo.create({
      stage: dto.stage,
      question: dto.question,
      answer: dto.answer,
      sortOrder: dto.sortOrder ?? 1000,
      isActive: dto.isActive ?? true,
    });
    return this.faqRepo.save(f);
  }

  async updateFaq(id: string, dto: UpdateFaqDto): Promise<Faq> {
    const f = await this.getFaq(id);
    if (dto.stage !== undefined) f.stage = dto.stage;
    if (dto.question !== undefined) f.question = dto.question;
    if (dto.answer !== undefined) f.answer = dto.answer;
    if (dto.sortOrder !== undefined) f.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) f.isActive = dto.isActive;
    return this.faqRepo.save(f);
  }

  async deleteFaq(id: string): Promise<{ ok: true }> {
    const f = await this.getFaq(id);
    await this.faqRepo.remove(f);
    this.logger.log(`删除 FAQ id=${id} question="${f.question}"`);
    return { ok: true };
  }

  // ======================== 批量（管理端快捷操作） ========================

  /**
   * 批量启用/停用教程
   */
  async batchUpdateTutorials(
    ids: string[],
    patch: { isActive?: boolean; sortOrder?: number },
  ): Promise<{ updated: number }> {
    if (!ids.length) return { updated: 0 };
    const partial: Partial<Tutorial> = {};
    if (patch.isActive !== undefined) partial.isActive = patch.isActive;
    if (patch.sortOrder !== undefined) partial.sortOrder = patch.sortOrder;
    const result = await this.tutorialRepo.update({ id: In(ids) }, partial);
    return { updated: result.affected ?? 0 };
  }
}
