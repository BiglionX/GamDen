import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { OpenIMWebhookService } from './openim-webhook.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import {
  OpenIMWebhookAck,
  OpenIMWebhookEnvelope,
} from './openim-webhook.types';

/**
 * OpenIM Webhook 入口控制器
 *
 * 路径前缀：`/webhook/openim`
 *  - 在 OpenIM Server 控制台配置 callbackURL 指向：
 *      https://<your-backend>/webhook/openim
 *
 * 安全：
 *  - 使用 WebhookSignatureGuard 校验签名（HMAC-SHA256 of rawBody）
 *  - 跳过全局 RolesGuard（在本模块 configure 时排除，见 openim-webhook.module.ts）
 *
 * 响应：
 *  - 必须返回 { errCode: 0, errMsg: 'ok' } 表示处理成功
 *  - errCode 非 0 会触发 OpenIM 重试（我们的幂等去重保证重试安全）
 */
@ApiExcludeController() // 不在 Swagger 文档中暴露
@Controller('webhook/openim')
export class OpenIMWebhookController {
  private readonly logger = new Logger(OpenIMWebhookController.name);

  constructor(private readonly webhookService: OpenIMWebhookService) {}

  /**
   * OpenIM Webhook 统一入口
   * - OpenIM 不同时期可能使用不同路径，统一收敛到这一个 handler
   * - 此方法单独挂 WebhookSignatureGuard（ping 不需要校验）
   */
  @Post()
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  async handle(@Body() envelope: OpenIMWebhookEnvelope): Promise<OpenIMWebhookAck> {
    if (!envelope || !envelope.command) {
      this.logger.warn('[Webhook] 收到空 envelope 或缺少 command 字段');
      return { errCode: 1001, errMsg: 'invalid envelope' };
    }

    this.logger.log(
      `[Webhook] 收到事件 command=${envelope.command} eventId=${envelope.eventId ?? '-'}`,
    );

    const result = await this.webhookService.handle(envelope);

    if (!result.success) {
      // 返回非 0 会触发 OpenIM 重试
      this.logger.warn(
        `[Webhook] 处理失败 command=${envelope.command} msg=${result.message}`,
      );
      return { errCode: 1, errMsg: result.message };
    }

    return { errCode: 0, errMsg: 'ok' };
  }

  /**
   * 健康检查端点（无需签名）
   * - 用于 OpenIM 控制台测试连通性
   * - 注意：本端点单独声明，不带 WebhookSignatureGuard
   */
  @Post('ping')
  @HttpCode(200)
  ping(): { ok: true; timestamp: number } {
    return { ok: true, timestamp: Date.now() };
  }
}