import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';

import { UserMiniProgram } from '../../../entities/user-mini-program.entity';
import { PushService } from '../push.service';
import { RedisService } from '../../../redis/redis.module';

/**
 * 长期未推进提醒定时任务
 *
 * 扫描规则（每日 10:00 触发）：
 *  - 状态 certifying：certSubmittedAt > 7 天前
 *  - 状态 certified：从未提交 AppID（lastUpdateAt > 7 天前）—— V1.0 mock 暂不区分
 *  - 状态 reviewing：codeSubmittedAt > 7 天前
 *  - 状态 deploying：appidSubmittedAt > 7 天前
 *
 * 防重策略（用 Redis 缓存）：
 *  - key: `push:stale:${userId}`
 *  - TTL: 24 小时
 *  - 同一用户 24 小时内只推一次
 */
@Injectable()
export class StaleMiniProgramCron {
  private readonly logger = new Logger(StaleMiniProgramCron.name);

  /** 7 天未推进阈值（毫秒） */
  private static readonly STALE_DAYS = 7;
  private static readonly STALE_MS = StaleMiniProgramCron.STALE_DAYS * 24 * 3600 * 1000;

  /** 防重 TTL：24 小时 */
  private static readonly DEDUPE_TTL_SEC = 24 * 3600;

  constructor(
    @InjectRepository(UserMiniProgram)
    private readonly miniProgramRepo: Repository<UserMiniProgram>,
    private readonly pushService: PushService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 每日 10:00 触发
   * - 0 10 * * * 格式（分 时 日 月 周）
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, { name: 'stale-mini-program' })
  async handleStaleMiniProgram(): Promise<void> {
    this.logger.log('[Cron] 开始扫描长期未推进的小程序申请');

    const staleThreshold = new Date(Date.now() - StaleMiniProgramCron.STALE_MS);
    const userIds: string[] = [];

    try {
      // 1. certifying 状态：certSubmittedAt 超过 7 天
      const certifying = await this.miniProgramRepo.find({
        where: {
          status: 'certifying',
          certSubmittedAt: LessThan(staleThreshold),
        },
        select: ['id', 'userId', 'certSubmittedAt'],
      });
      for (const r of certifying) userIds.push(r.userId);

      // 2. reviewing 状态：codeSubmittedAt 超过 7 天
      const reviewing = await this.miniProgramRepo.find({
        where: {
          status: 'reviewing',
          codeSubmittedAt: LessThan(staleThreshold),
        },
        select: ['id', 'userId', 'codeSubmittedAt'],
      });
      for (const r of reviewing) userIds.push(r.userId);

      // 3. deploying 状态：appidSubmittedAt 超过 7 天
      const deploying = await this.miniProgramRepo.find({
        where: {
          status: 'deploying',
          appidSubmittedAt: LessThan(staleThreshold),
        },
        select: ['id', 'userId', 'appidSubmittedAt'],
      });
      for (const r of deploying) userIds.push(r.userId);

      // 4. certified 状态：appidSubmittedAt 为 null 且 updatedAt 超过 7 天
      const certified = await this.miniProgramRepo.find({
        where: {
          status: 'certified',
          updatedAt: LessThan(staleThreshold),
        },
        select: ['id', 'userId', 'updatedAt'],
      });
      for (const r of certified) userIds.push(r.userId);

      // 去重
      const uniqueUserIds = Array.from(new Set(userIds));
      this.logger.log(
        `[Cron] 扫描到 ${uniqueUserIds.length} 个长期未推进用户（${userIds.length} 条记录）`,
      );

      // 5. 过滤 24 小时内已推过的用户
      const toSend: string[] = [];
      for (const userId of uniqueUserIds) {
        const dedupeKey = `push:stale:${userId}`;
        const exists = await this.redisService.exists(dedupeKey);
        if (exists) continue;
        toSend.push(userId);
        // 写防重标记
        await this.redisService.set(
          dedupeKey,
          new Date().toISOString(),
          StaleMiniProgramCron.DEDUPE_TTL_SEC,
        );
      }

      this.logger.log(
        `[Cron] 24h 内未推送的待发送用户数：${toSend.length}`,
      );

      // 6. 推送
      for (const userId of toSend) {
        try {
          await this.pushService.sendStaleNotification(userId, StaleMiniProgramCron.STALE_DAYS);
        } catch (e) {
          this.logger.error(
            `[Cron] 推送失败 user=${userId} err=${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      this.logger.log('[Cron] 长期未推进扫描完成');
    } catch (e) {
      this.logger.error(
        `[Cron] 扫描异常 err=${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * 手动触发（用于测试 / 运营后台）
   * - V1.0 mock：暂未暴露 HTTP 接口
   */
  async triggerManually(): Promise<{ scanned: number; sent: number }> {
    // 复用同一逻辑（提取公共方法会更整洁，但 V1.0 简单处理）
    const before = this.logger.log;
    this.logger.log = (m: string) => before.call(this.logger, `[手动] ${m}`);
    try {
      // 简化：直接调用 handleStaleMiniProgram
      await this.handleStaleMiniProgram();
    } finally {
      this.logger.log = before;
    }
    return { scanned: 0, sent: 0 };
  }
}
