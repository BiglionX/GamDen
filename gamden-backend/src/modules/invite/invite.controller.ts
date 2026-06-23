import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { InviteService } from './invite.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('邀请')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  @ApiOperation({ summary: '生成新邀请码' })
  generate(@CurrentUser() current: JwtUserPayload) {
    return this.inviteService.generate(current.sub);
  }

  @Get('me')
  @ApiOperation({ summary: '我的邀请码 + 进度' })
  getMine(@CurrentUser() current: JwtUserPayload) {
    return this.inviteService.getMyInvite(current.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: '详细邀请统计（今日/本周/总数）' })
  getStats(@CurrentUser() current: JwtUserPayload) {
    return this.inviteService.getStats(current.sub);
  }

  @Get('invitees')
  @ApiOperation({ summary: '被邀请人列表（昵称/头像/邀请时间）' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  getInvitees(
    @CurrentUser() current: JwtUserPayload,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;
    return this.inviteService.getInvitees(current.sub, n);
  }

  @Get('poster')
  @ApiOperation({ summary: '邀请海报数据（前端 Canvas 渲染用）' })
  getPoster(@CurrentUser() current: JwtUserPayload) {
    return this.inviteService.getPosterData(current.sub);
  }

  @Get('mini-program-code')
  @ApiOperation({ summary: '个人专属小程序码（≥3 人解锁）' })
  getMiniProgramCode(@CurrentUser() current: JwtUserPayload) {
    return this.inviteService.getMiniProgramCode(current.sub);
  }
}
