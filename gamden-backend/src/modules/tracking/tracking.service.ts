import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { TrackEvent } from '../../entities/track-event.entity';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { TrackEventDto } from './dto/track-event.dto';

/**
 * 埋点事件服务
 *
 * 提供三类埋点入口：
 *  - trackClient(): 前端 HTTP 上报（POST /v1/track/event）
 *  - trackBatch():  前端批量上报（POST /v1/track/batch）
 *  - trackServer(): 业务模块直接调用（如 MiniProgramService.markAsCertified）
 *
 * 设计原则：
 *  - 所有埋点均异步写库，不阻塞主流程（fire-and-forget）
 *  - 失败仅记日志，不抛异常（埋点失败不应影响业务）
 *  - V1.0 mock：仅写 DB + 日志；V1.1 可对接 GrowingIO / 神策
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(TrackEvent)
    private readonly trackEventRepo: Repository<TrackEvent>,
  ) {}

  /**
   * 处理前端单个埋点上报
   * - 已登录：从 JWT 提取 userId
   * - 游客态：从 X-Device-ID 提取 deviceId
   */
  async trackClient(
    dto: TrackEventDto,
    user: JwtUserPayload | null,
    req: Request,
  ): Promise<{ ok: true }> {
    const deviceId =
      (req.headers['x-device-id'] as string | undefined) ?? null;

    // fire-and-forget
    void this.persist({
      eventName: dto.eventName,
      userId: user?.sub ?? null,
      deviceId,
      properties: dto.properties ?? null,
      pageUrl: dto.pageUrl ?? null,
      platform: dto.platform ?? null,
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    });

    return { ok: true };
  }

  /**
   * 处理前端批量埋点上报
   */
  async trackBatch(
    events: TrackEventDto[],
    user: JwtUserPayload | null,
    req: Request,
  ): Promise<{ ok: true; count: number }> {
    if (!events || events.length === 0) return { ok: true, count: 0 };

    const deviceId =
      (req.headers['x-device-id'] as string | undefined) ?? null;
    const ip = req.ip ?? null;
    const ua = (req.headers['user-agent'] as string | undefined) ?? null;

    const records = events.map((e) =>
      this.trackEventRepo.create({
        eventName: e.eventName,
        userId: user?.sub ?? null,
        deviceId,
        properties: e.properties ?? null,
        pageUrl: e.pageUrl ?? null,
        platform: e.platform ?? null,
        ipAddress: ip,
        userAgent: ua,
      }),
    );

    void this.trackEventRepo
      .save(records)
      .catch((err) =>
        this.logger.error(
          `[Tracking] 批量埋点失败 count=${records.length} err=${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return { ok: true, count: records.length };
  }

  /**
   * 服务端主动埋点（业务模块调用）
   *
   * 用法：
   *   await this.trackingService.trackServer(
   *     'mp_qualification_unlocked',
   *     { userId, properties: { invite_count: 3 } },
   *   );
   */
  async trackServer(
    eventName: string,
    options: {
      userId?: string | null;
      deviceId?: string | null;
      properties?: Record<string, unknown>;
      pageUrl?: string | null;
      platform?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    } = {},
  ): Promise<void> {
    await this.persist({
      eventName,
      userId: options.userId ?? null,
      deviceId: options.deviceId ?? null,
      properties: options.properties ?? null,
      pageUrl: options.pageUrl ?? null,
      platform: options.platform ?? 'server',
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });
  }

  /**
   * 异步写库（fire-and-forget）
   */
  private async persist(payload: {
    eventName: string;
    userId: string | null;
    deviceId: string | null;
    properties: Record<string, unknown> | null;
    pageUrl: string | null;
    platform: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    try {
      const entity = this.trackEventRepo.create(payload);
      await this.trackEventRepo.save(entity);
      this.logger.debug(
        `[Track] ${payload.eventName} user=${payload.userId ?? '-'} device=${payload.deviceId?.slice(0, 8) ?? '-'} props=${JSON.stringify(payload.properties ?? {})}`,
      );
    } catch (e) {
      this.logger.error(
        `[Tracking] 写库失败 event=${payload.eventName} err=${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
