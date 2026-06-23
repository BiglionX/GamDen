import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../entities/user.entity';
import { UserMiniProgram } from '../../entities/user-mini-program.entity';
import { MiniProgramLog } from '../../entities/mini-program-log.entity';
import { Tutorial } from '../../entities/tutorial.entity';
import { Faq } from '../../entities/faq.entity';

import { AdminService } from './admin.service';
import { ContentService } from './content.service';
import { AdminController } from './admin.controller';
import { PushModule } from '../push/push.module';
import { TrackingModule } from '../tracking/tracking.module';

/**
 * Admin Module —— 后台运营管理
 *
 * 路由前缀：/api/v1/admin
 * 鉴权：所有接口需 JWT + role==='admin'（Controller @Roles('admin') + 全局 RolesGuard）
 *
 * 模块依赖图：
 *   AdminModule ──imports──▶ PushModule     (提醒推送)
 *   AdminModule ──imports──▶ TrackingModule (写埋点)
 *   AdminModule 内部使用 TypeORM 直接查询 User / UserMiniProgram / MiniProgramLog / Tutorial / Faq
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserMiniProgram,
      MiniProgramLog,
      Tutorial,
      Faq,
    ]),
    PushModule,
    TrackingModule,
  ],
  providers: [AdminService, ContentService],
  controllers: [AdminController],
  exports: [AdminService, ContentService],
})
export class AdminModule {}
