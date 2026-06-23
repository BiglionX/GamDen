import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserMiniProgram } from '../../entities/user-mini-program.entity';
import { User } from '../../entities/user.entity';
import { Tutorial } from '../../entities/tutorial.entity';
import { MiniProgramService } from './mini-program.service';
import { MiniProgramController } from './mini-program.controller';
import { WechatService } from './wechat.service';
import { PushModule } from '../push/push.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMiniProgram, User, Tutorial]),
    // 推送模块（用于认证通过 / 上线 / 长期未推进提醒触发）
    PushModule,
    // 埋点模块（用于 4 个状态埋点 + 教程查看埋点）
    TrackingModule,
  ],
  providers: [MiniProgramService, WechatService],
  controllers: [MiniProgramController],
  exports: [MiniProgramService, WechatService],
})
export class MiniProgramModule {}
