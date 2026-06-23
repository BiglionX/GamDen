import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { Request } from 'express';
import {
  SIGNATURE_HEADER_CANDIDATES,
} from '../openim-webhook.types';

/**
 * OpenIM Webhook 签名校验 Guard
 *
 * 校验逻辑：
 *  1. 从多个候选 Header 中读取签名（兼容不同 OpenIM 版本）
 *  2. 从 req.rawBody 取原始字节流（由 RawBodyMiddleware 写入）
 *  3. 用 HMAC-SHA256(secret, rawBody) 计算期望签名
 *  4. 使用 timingSafeEqual 常时间比较（防时序攻击）
 *
 * 配置：
 *  - im.webhookSecret  OpenIM 服务端配置的回调密钥（需保持一致）
 *  - im.webhookSkipVerify  开发期可设为 true 跳过校验（仅限 dev/test）
 *
 * 注意：
 *  - 必须配合 RawBodyMiddleware 使用
 *  - 校验失败立即抛出 401，不会进入 Controller
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly secret: string;
  private readonly skipVerify: boolean;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>('im.webhookSecret') ||
      this.config.get<string>('im.callbackSecret') ||
      '';
    this.skipVerify =
      this.config.get<boolean>('im.webhookSkipVerify', false) === true;
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.skipVerify) {
      this.logger.warn(
        '[Webhook] 签名校验已跳过（im.webhookSkipVerify=true，仅用于开发）',
      );
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();

    // 1. 读取签名（兼容多种 header 命名）
    const signature = this.extractSignature(req);
    if (!signature) {
      this.logger.warn(
        `[Webhook] 缺少签名 header（尝试过：${SIGNATURE_HEADER_CANDIDATES.join(', ')}）`,
      );
      throw new UnauthorizedException('缺少签名');
    }

    // 2. 取原始 body
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      this.logger.warn('[Webhook] rawBody 为空（中间件未生效？）');
      throw new UnauthorizedException('请求体为空');
    }

    // 3. 校验 secret 已配置
    if (!this.secret) {
      this.logger.error('[Webhook] im.webhookSecret 未配置，拒绝所有请求');
      throw new UnauthorizedException('签名密钥未配置');
    }

    // 4. 计算期望签名
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');

    // 5. 常时间比较（防时序攻击）
    const sigBuf = Buffer.from(signature.toLowerCase(), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      this.logger.warn(
        `[Webhook] 签名不匹配（got=${signature.slice(0, 8)}..., expected=${expected.slice(0, 8)}...）`,
      );
      throw new UnauthorizedException('签名校验失败');
    }

    return true;
  }

  /**
   * 依次从候选 header 中读取签名
   */
  private extractSignature(req: Request): string | null {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    for (const name of SIGNATURE_HEADER_CANDIDATES) {
      const v = headers[name] ?? headers[name.toLowerCase()];
      if (typeof v === 'string' && v.length > 0) return v;
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
    }
    return null;
  }
}