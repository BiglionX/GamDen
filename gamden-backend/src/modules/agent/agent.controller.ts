import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgentService } from './agent.service';

@ApiTags('代理')
@ApiBearerAuth()
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  @ApiOperation({ summary: 'Agent 模块状态（V1.0 占位）' })
  status() {
    return this.agentService.getStatus();
  }
}
