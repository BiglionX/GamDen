import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OpenIMWebhookController } from './openim-webhook.controller';
import { OpenIMWebhookService } from './openim-webhook.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
// 注意：RawBodyMiddleware 已通过 NestFactory({ rawBody: true }) 自动启用，
// 无需手动注册。如需切换到手动模式，取消下方 import 与 configure 注册即可。

import { User } from '../../entities/user.entity';
import { Club } from '../../entities/club.entity';
import { TerritoryModule } from '../../modules/territory/territory.module';
import { ClubModule } from '../../modules/club/club.module';
import { UserModule } from '../../modules/user/user.module';

/**
 * OpenIM Webhook 模块
 *
 * 设计：
 *  - 路由前缀：/webhook/openim
 *  - 启用 NestJS 原生 rawBody 支持（main.ts: rawBody: true），无需自定义中间件
 *  - 挂载 WebhookSignatureGuard 仅作用于具体 handler（ping 端点豁免）
 *  - 导入业务模块（Territory/Club/User）以便触发领地/俱乐部同步
 *  - 注册 User/Club 实体用于幂等检查与 owner 校验
 *
 * OpenIM Server 端需要配置：
 *  - callbackURL = https://<your-backend>/api/v1/webhook/openim
 *  - callbackSecret = im.webhookSecret（保持一致）
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Club]),
    UserModule,
    TerritoryModule,
    ClubModule,
  ],
  controllers: [OpenIMWebhookController],
  providers: [OpenIMWebhookService, WebhookSignatureGuard],
  exports: [OpenIMWebhookService],
})
export class OpenIMWebhookModule {}