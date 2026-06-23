import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { Territory } from '../../entities/territory.entity';
import { TerritoryEvolution } from '../../entities/territory-evolution.entity';
import { User } from '../../entities/user.entity';

/**
 * 领地等级经验阶梯（用户指定）
 * Lv.1 -> Lv.2 需 100 exp
 * Lv.2 -> Lv.3 需 300 exp
 * Lv.3 -> Lv.4 需 600 exp
 * Lv.4 -> Lv.5 需 1000 exp
 */
export const LEVEL_EXP_TABLE: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 100,
  2: 300,
  3: 600,
  4: 1000,
};

/** 等级对应的视觉资源（与前端 types/territory.ts 对齐） */
export const LEVEL_VISUALS: Readonly<
  Record<1 | 2 | 3 | 4 | 5, { emoji: string; label: string; iconUrl: string }>
> = {
  1: { emoji: '🌱', label: '树苗',     iconUrl: 'emoji:🌱' },
  2: { emoji: '🌿', label: '小树林',   iconUrl: 'emoji:🌿' },
  3: { emoji: '🏡', label: '木屋',     iconUrl: 'emoji:🏡' },
  4: { emoji: '🏘️', label: '石屋群',   iconUrl: 'emoji:🏘️' },
  5: { emoji: '🏯', label: '小型寨落', iconUrl: 'emoji:🏯' },
};

/**
 * 经验获取规则
 */
export const EXP_RULES = {
  signin: { action: '每日签到', exp: 10, cooldown: '24h' },
  post:   { action: '发布帖子', exp: 30, dailyLimit: 3 },
  reply:  { action: '回复帖子', exp: 5,  dailyLimit: 10 },
  invite: { action: '邀请好友成功入驻', exp: 200, note: '邀请人获得' },
  likedPost: { action: '帖子被点赞', exp: 2, dailyLimit: 50 },
} as const;

@Injectable()
export class TerritoryService {
  private readonly logger = new Logger(TerritoryService.name);

  constructor(
    @InjectRepository(Territory)
    private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(TerritoryEvolution)
    private readonly evolutionRepo: Repository<TerritoryEvolution>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  // ============== API 1: 获取当前用户领地详情 ==============

  async findMyTerritory(userId: string): Promise<Territory> {
    let territory = await this.territoryRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!territory) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');
      territory = await this.createTerritoryGlobal(user);
    }
    return territory;
  }

  // ============== API 2: 按坐标查邻居 ==============

  async findNeighborsByCoords(
    centerX: number,
    centerY: number,
    range = 10,
  ): Promise<Territory[]> {
    const safeRange = Math.min(Math.max(range, 1), 50);
    return this.territoryRepo.find({
      where: {
        coordX: Between(centerX - safeRange, centerX + safeRange),
        coordY: Between(centerY - safeRange, centerY + safeRange),
      },
      take: 200,
      relations: { user: true },
      order: { coordY: 'ASC', coordX: 'ASC' },
    });
  }

  // ============== API 3: 领地升级 ==============

  /**
   * 升级领地：消耗经验值，达到阈值后升到下一级
   * - 调用方传入本次获取的 expDelta（已累计好的值）
   * - 这里按等级阶梯逐级判断
   */
  async upgrade(
    territoryId: string,
    expDelta: number,
    source: TerritoryEvolution['unlockSource'] = 'upgrade',
  ): Promise<Territory> {
    const territory = await this.territoryRepo.findOne({
      where: { id: territoryId },
    });
    if (!territory) throw new NotFoundException('领地不存在');

    if (territory.level >= 5) {
      throw new ConflictException('已达最高等级 Lv.5');
    }

    if (expDelta <= 0) {
      throw new ConflictException('经验值增量必须大于 0');
    }

    territory.exp += expDelta;
    const unlockedLevels: Array<1 | 2 | 3 | 4 | 5> = [];

    // 逐级判断 + 升级
    while (territory.level < 5) {
      const required = LEVEL_EXP_TABLE[territory.level as 1 | 2 | 3 | 4];
      if (territory.exp < required) break;

      territory.exp -= required;
      territory.level = (territory.level + 1) as Territory['level'];
      unlockedLevels.push(territory.level);

      // 写入 evolution 记录
      const visual = LEVEL_VISUALS[territory.level];
      const exists = await this.evolutionRepo.findOne({
        where: { userId: territory.userId, level: territory.level },
      });
      if (!exists) {
        await this.evolutionRepo.save(
          this.evolutionRepo.create({
            userId: territory.userId,
            level: territory.level,
            iconUrl: visual.iconUrl,
            unlockedAt: new Date(),
            unlockSource: source,
          }),
        );
      }
    }

    await this.territoryRepo.save(territory);

    if (unlockedLevels.length > 0) {
      this.logger.log(
        `Territory ${territory.id} unlocked Lv.${unlockedLevels.join('/')}`,
      );
    }

    return territory;
  }

  /**
   * 升级 + 返回解锁信息（前端展示升级动画用）
   */
  async upgradeWithUnlocks(
    territoryId: string,
    expDelta: number,
    source: TerritoryEvolution['unlockSource'] = 'upgrade',
  ): Promise<{
    territory: Territory;
    unlockedLevels: Array<1 | 2 | 3 | 4 | 5>;
    expRemain: number;
  }> {
    const before = await this.findTerritoryOrThrow(territoryId);
    const beforeLevel = before.level;
    const updated = await this.upgrade(territoryId, expDelta, source);
    const unlocked: Array<1 | 2 | 3 | 4 | 5> = [];
    for (let lv = beforeLevel + 1; lv <= updated.level; lv++) {
      unlocked.push(lv as 1 | 2 | 3 | 4 | 5);
    }
    return {
      territory: updated,
      unlockedLevels: unlocked,
      expRemain: updated.exp,
    };
  }

  // ============== API 4: 经验值获取规则 ==============

  getExpRules(): {
    levelTable: typeof LEVEL_EXP_TABLE;
    sources: typeof EXP_RULES;
    maxLevel: 5;
  } {
    return {
      levelTable: LEVEL_EXP_TABLE,
      sources: EXP_RULES,
      maxLevel: 5,
    };
  }

  // ============== 注册时调用：分配坐标 ==============

  /**
   * 注册时分配新用户领地坐标
   * - 默认全局随机分配（-1000~1000）
   * - 如果传 inviterId，会尝试分配在邀请人相邻 8 格
   *   - 失败 8 次后回退到全局随机
   */
  async assignTerritoryForUser(
    em: EntityManager,
    userId: string,
    inviterId?: string,
  ): Promise<Territory> {
    const min = this.config.get<number>('app.territory.coordMin', -1000);
    const max = this.config.get<number>('app.territory.coordMax', 1000);

    // 1. 如果有邀请人，先尝试 8 邻域
    if (inviterId) {
      const inviter = await em.findOne(Territory, { where: { userId: inviterId } });
      if (inviter) {
        const neighborCoord = await this.pickNeighborCoord(
          em,
          inviter.coordX,
          inviter.coordY,
          min,
          max,
        );
        if (neighborCoord) {
          return this.saveNewTerritory(em, userId, neighborCoord.x, neighborCoord.y);
        }
        this.logger.warn(
          `Inviter ${inviterId} 周围 8 格已满，回退到全局随机分配`,
        );
      }
    }

    // 2. 全局随机
    const globalCoord = await this.pickGlobalCoord(em, min, max);
    return this.saveNewTerritory(em, userId, globalCoord.x, globalCoord.y);
  }

  /**
   * 在 (cx, cy) 的 8 邻域中找一个未被占用的坐标
   * 返回 null 表示 8 格都满了
   */
  private async pickNeighborCoord(
    em: EntityManager,
    cx: number,
    cy: number,
    min: number,
    max: number,
  ): Promise<{ x: number; y: number } | null> {
    const offsets: Array<[number, number]> = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1],
    ];

    // Fisher-Yates 洗牌，保证随机性
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    for (const [dx, dy] of offsets) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < min || x > max || y < min || y > max) continue;
      const exists = await em.findOne(Territory, { where: { coordX: x, coordY: y } });
      if (!exists) return { x, y };
    }
    return null;
  }

  /**
   * 全局范围随机找一个未被占用的坐标
   */
  private async pickGlobalCoord(
    em: EntityManager,
    min: number,
    max: number,
  ): Promise<{ x: number; y: number }> {
    const range = max - min + 1;
    for (let i = 0; i < 30; i++) {
      const x = min + Math.floor(Math.random() * range);
      const y = min + Math.floor(Math.random() * range);
      const exists = await em.findOne(Territory, { where: { coordX: x, coordY: y } });
      if (!exists) return { x, y };
    }
    throw new ConflictException('领地坐标分配失败，请稍后重试');
  }

  private async saveNewTerritory(
    em: EntityManager,
    userId: string,
    coordX: number,
    coordY: number,
  ): Promise<Territory> {
    const territory = em.create(Territory, {
      userId,
      coordX,
      coordY,
      level: 1,
      exp: 0,
      nextLevelExp: LEVEL_EXP_TABLE[1],
    });
    await em.save(territory);
    return territory;
  }

  // ============== 辅助方法 ==============

  async findTerritoryOrThrow(id: string): Promise<Territory> {
    const territory = await this.territoryRepo.findOne({ where: { id } });
    if (!territory) throw new NotFoundException('领地不存在');
    return territory;
  }

  /**
   * 创建默认领地（用于已有 user 但缺 territory 的边界场景）
   */
  async createTerritoryGlobal(user: User): Promise<Territory> {
    const globalCoord = await this.pickGlobalCoord(this.territoryRepo.manager, -1000, 1000);
    return this.saveNewTerritory(this.territoryRepo.manager, user.id, globalCoord.x, globalCoord.y);
  }

  /**
   * 获取用户的 evolution 历史
   */
  async getEvolutionsByUser(userId: string): Promise<TerritoryEvolution[]> {
    return this.evolutionRepo.find({
      where: { userId },
      order: { level: 'ASC' },
    });
  }
}
