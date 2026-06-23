import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../entities/user.entity';
import { UnipushClient, UnipushSinglePushBody } from './unipush.client';

/**
 * 推送场景枚举
 * - 与前端路由参数 (pushScene) 一一对应
 * - 客户端收到推送后根据 scene 决定跳转目标
 */
export type PushScene =
  | 'mini_program_unlocked'      // 邀请达标，解锁个人小程序
  | 'mini_program_certified'     // 微信认证通过
  | 'mini_program_online'        // 小程序已上线
  | 'mini_program_stale';        // 长期未推进提醒

/**
 * 推送 payload（与前端约定格式）
 */
export interface PushPayload {
  scene: PushScene;
  title: string;
  content: string;
  /** 跳转目标（前端 pages.json 中的 path） */
  pagePath: string;
  /** 透传业务数据（前端解析后跳转） */
  extras?: Record<string, string | number | boolean>;
}

/**
 * 单次推送结果（用于审计 / 限流统计）
 */
export interface PushDeliveryResult {
  userId: string;
  ok: boolean;
  tokenCount: number;
  live: boolean;
  reason?: string;
  taskId?: string;
}

/**
 * 推送服务 —— 抽象层
 *
 * V1.0：mock 实现，仅在控制台输出 + 写日志，便于本地调试与 CI
 * V1.1：unipush（个推）真实推送
 *        - 通过 UnipushClient 调用个推 REST API
 *        - 自动鉴权（token 缓存 + 并发去重）
 *        - 多端 token 循环推送
 *
 * 设计原则：
 *  - 业务模块只依赖 PushService.sendToUser()，不关心具体推送实现
 *  - token 存储在 user 表（uni-push 推送 token 体系）
 *  - 单用户多条 token：多端登录场景，循环推送
 *  - 失败不抛异常：推送失败不应阻塞业务主流程；只写日志 + 返回结果
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    private readonly unipush: UnipushClient,
  ) {}

  /**
   * 向指定用户发送推送
   * - V1.0 mock：仅日志输出
   * - V1.1+：unipush 真实推送
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<PushDeliveryResult> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'phone', 'pushTokens', 'pushEnabled'],
    });

    if (!user) {
      this.logger.warn(`[推送] 用户 ${userId} 不存在，跳过`);
      return { userId, ok: false, tokenCount: 0, live: false, reason: 'user_not_found' };
    }

    if (!user.pushEnabled) {
      this.logger.log(`[推送] 用户 ${userId} 已关闭推送，跳过 scene=${payload.scene}`);
      return { userId, ok: false, tokenCount: 0, live: this.unipush.isLive(), reason: 'disabled' };
    }

    const tokens = (user.pushTokens as string[] | null) ?? [];

    if (tokens.length === 0) {
      this.logger.log(
        `[推送] 用户 ${userId} (${user.phone}) 无推送 token，仅写日志 scene=${payload.scene}`,
      );
      this.logPayload(userId, payload);
      return { userId, ok: false, tokenCount: 0, live: this.unipush.isLive(), reason: 'no_token' };
    }

    // 构造 unipush body（个推 v2 简化版）
    const body: UnipushSinglePushBody = {
      request_id: `${userId}_${Date.now()}`,
      audience: { cid: tokens },
      push_message: {
        notification: {
          title: payload.title,
          body: payload.content,
          click_type: 'payload', // 客户端解析 payload 中的 pagePath 跳转
          payload: JSON.stringify({
            scene: payload.scene,
            pagePath: payload.pagePath,
            ...(payload.extras ?? {}),
          }),
        },
        // 客户端在线时透传，App 启动后第一时间拿到
        transmission: {
          transmission_content: JSON.stringify({
            scene: payload.scene,
            pagePath: payload.pagePath,
            title: payload.title,
            content: payload.content,
            ...(payload.extras ?? {}),
          }),
          transmission_type: 'unicast',
        },
      },
    };

    try {
      const result = await this.unipush.pushByCids(tokens, body);
      this.logPayload(userId, payload);
      return {
        userId,
        ok: result.code === 0,
        tokenCount: tokens.length,
        live: this.unipush.isLive(),
        taskId: result.data?.taskid,
        reason: result.code === 0 ? undefined : `code=${result.code} msg=${result.msg}`,
      };
    } catch (e) {
      this.logger.error(
        `[推送] 失败 user=${userId} scene=${payload.scene} err=${e instanceof Error ? e.message : String(e)}`,
      );
      this.logPayload(userId, payload);
      return {
        userId,
        ok: false,
        tokenCount: tokens.length,
        live: this.unipush.isLive(),
        reason: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /**
   * 批量推送（用于定时任务扫描后的群发）
   * - 串行发送避免触发推送平台限流
   */
  async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<PushDeliveryResult[]> {
    const results: PushDeliveryResult[] = [];
    for (const userId of userIds) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.sendToUser(userId, payload);
      results.push(r);
    }
    return results;
  }

  // ======================== 业务便捷方法 ========================

  /** 邀请达标，解锁个人小程序 */
  async sendUnlockedNotification(userId: string): Promise<PushDeliveryResult> {
    return this.sendToUser(userId, {
      scene: 'mini_program_unlocked',
      title: '🎉 你解锁了个人专属小程序！',
      content: '邀请满3人，GamDen送你一个属于自己的小程序入口。点此查看 →',
      pagePath: '/pages/invite/mini-program',
      extras: { source: 'invite_unlock' },
    });
  }

  /** 微信认证通过 */
  async sendCertifiedNotification(userId: string): Promise<PushDeliveryResult> {
    return this.sendToUser(userId, {
      scene: 'mini_program_certified',
      title: '✅ 你的小程序认证已通过',
      content: '微信审核已通过，快来完成最后一步部署吧！',
      pagePath: '/pages/invite/mini-program',
      extras: { source: 'wechat_certified' },
    });
  }

  /** 小程序已上线 */
  async sendOnlineNotification(userId: string): Promise<PushDeliveryResult> {
    return this.sendToUser(userId, {
      scene: 'mini_program_online',
      title: '🎊 你的小程序已上线！',
      content: '恭喜！你的专属小程序现在可以被所有人看到了！',
      pagePath: '/pages/invite/mini-program',
      extras: { source: 'wechat_online' },
    });
  }

  /** 长期未推进提醒 */
  async sendStaleNotification(
    userId: string,
    daysSince: number,
  ): Promise<PushDeliveryResult> {
    return this.sendToUser(userId, {
      scene: 'mini_program_stale',
      title: '⏳ 你的小程序申请还没完成',
      content: '还差最后一步，你的专属小程序就能上线了。点此继续 →',
      pagePath: '/pages/invite/mini-program',
      extras: { source: 'stale_reminder', daysSince },
    });
  }

  // ======================== 内部 ========================

  private logPayload(userId: string, payload: PushPayload): void {
    this.logger.debug(
      `[推送详情] user=${userId} scene=${payload.scene} ` +
        `title="${payload.title}" content="${payload.content}" ` +
        `pagePath=${payload.pagePath} extras=${JSON.stringify(payload.extras ?? {})}`,
    );
  }
}
