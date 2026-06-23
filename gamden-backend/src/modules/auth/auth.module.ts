import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { User } from '../../entities/user.entity';
import { Territory } from '../../entities/territory.entity';
import { Invite } from '../../entities/invite.entity';
import { SmsModule } from '../sms/sms.module';
import { InviteModule } from '../invite/invite.module';
import { ImModule } from '../im/im.module';
import { PushModule } from '../push/push.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Territory, Invite]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule 已在 AppModule 全局注册，此处直接复用
    SmsModule,
    InviteModule,
    ImModule,
    // 推送模块（用于邀请达标推送：🎉 你解锁了个人专属小程序！）
    PushModule,
    // 埋点模块（用于邀请达标埋点：mp_qualification_unlocked）
    TrackingModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
