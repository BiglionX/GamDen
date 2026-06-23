import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrackEvent } from '../../entities/track-event.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

/**
 * 埋点模块
 *
 * 设计原则（避免循环依赖）：
 *  - TrackingModule 不依赖业务模块
 *  - 业务模块（如 AuthModule、MiniProgramModule）按需导入 TrackingModule
 *  - 模块依赖图：
 *      AuthModule        ──imports──▶ TrackingModule
 *      MiniProgramModule ──imports──▶ TrackingModule
 *      AppModule         ──imports──▶ TrackingModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([TrackEvent])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
