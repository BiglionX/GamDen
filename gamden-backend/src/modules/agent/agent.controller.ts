import { Controller, Get, Post, Query, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('代理/守护灵')
@ApiBearerAuth()
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  @ApiOperation({ summary: 'Agent 模块状态（V1.0 占位）' })
  status() {
    return this.agentService.getStatus();
  }

  @Get('dialogues')
  @ApiOperation({ summary: '获取守护灵话术配置' })
  async getDialogues(@Query('scene') scene: string) {
    return this.agentService.getDialogues(scene);
  }

  @Post('onboarding/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '记录用户入驻完成' })
  async completeOnboarding(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.agentService.completeOnboarding(userId);
  }

  @Post('onboarding/event')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '记录入驻流程事件' })
  async recordOnboardingEvent(
    @Req() req: Request,
    @Body() body: { event: string; properties?: Record<string, any> },
  ) {
    const userId = (req as any).user?.userId;
    return this.agentService.recordOnboardingEvent(userId, body.event, body.properties);
  }
}
