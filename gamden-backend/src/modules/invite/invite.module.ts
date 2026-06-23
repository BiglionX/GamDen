import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invite } from '../../entities/invite.entity';
import { User } from '../../entities/user.entity';
import { Territory } from '../../entities/territory.entity';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invite, User, Territory])],
  providers: [InviteService],
  controllers: [InviteController],
  exports: [InviteService],
})
export class InviteModule {}
