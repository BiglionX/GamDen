import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../entities/user.entity';
import { UserMiniProgram } from '../../entities/user-mini-program.entity';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { StaleMiniProgramCron } from './cron/stale-mini-program.cron';
import { UnipushClient } from './unipush.client';

/**
 * 推送模块
 *
 * 设计原则（避免循环依赖）：
 *  - PushModule 不导入 MiniProgramModule（避免 A→B→A 循环）
 *  - cron 任务直接使用 Repository 查询 UserMiniProgram，不依赖 MiniProgramService
 *  - 业务模块（如 MiniProgramModule）反向导入 PushModule 以注入 PushService
 *
 * 模块依赖图：
 *   MiniProgramModule ──imports──▶ PushModule
 *   AppModule        ──imports──▶ ScheduleModule.forRoot() + PushModule
 *
 * 推送实现：
 *  - V1.0 mock（仅日志）
 *  - V1.1+ unipush（个推 REST API，由 UnipushClient 封装）
 *  - 由 PUSH_USE_MOCK 环境变量切换
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserMiniProgram])],
  providers: [PushService, StaleMiniProgramCron, UnipushClient],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
