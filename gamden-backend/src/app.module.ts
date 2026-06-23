import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import imConfig from './config/im.config';
import wechatConfig from './config/wechat.config';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TerritoryModule } from './modules/territory/territory.module';
import { InviteModule } from './modules/invite/invite.module';
import { ClubModule } from './modules/club/club.module';
import { MarketModule } from './modules/market/market.module';
import { AgentModule } from './modules/agent/agent.module';
import { SmsModule } from './modules/sms/sms.module';
import { ImModule } from './modules/im/im.module';
import { MiniProgramModule } from './modules/mini-program/mini-program.module';
import { PushModule } from './modules/push/push.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { AdminModule } from './modules/admin/admin.module';
import { OpenIMWebhookModule } from './common/webhook/openim-webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig, jwtConfig, redisConfig, imConfig, wechatConfig],
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<TypeOrmModuleOptions>('database') as TypeOrmModuleOptions,
    }),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.access.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.access.ttl', '2h') },
      }),
    }),

    // 定时任务调度（小程序长期未推进扫描每日 10:00 触发）
    ScheduleModule.forRoot(),

    // 全局 Redis（@Global，SmsService 可直接注入）
    RedisModule,

    // 业务模块
    AuthModule,
    UserModule,
    TerritoryModule,
    InviteModule,
    ClubModule,
    MarketModule,
    AgentModule,
    SmsModule,
    ImModule,
    MiniProgramModule,
    // 推送模块（推送服务 + 长期未推进 cron）
    PushModule,
    // 埋点模块（前端上报接收 + 服务端埋点 API）
    TrackingModule,
    // Admin 后台管理模块（运营端）
    AdminModule,

    // OpenIM Webhook（位于 common/webhook，独立模块）
    OpenIMWebhookModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
