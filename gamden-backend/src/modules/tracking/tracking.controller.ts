import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { TrackBatchDto, TrackEventDto } from './dto/track-event.dto';
import { TrackingService } from './tracking.service';

/**
 * 埋点接收 Controller
 *
 * 路由前缀：/api/v1/track
 * - 端点 1：POST /event    单事件上报（已登录 / 游客态均可）
 * - 端点 2：POST /batch    批量事件上报（前端队列批量发送）
 *
 * 鉴权策略：
 *  - 使用 OptionalJwtAuthGuard：有 token 解析 userId，无 token 视为游客态
 *  - 游客态埋点靠 device_id 关联（deviceIdMiddleware 已注入）
 */
@ApiTags('tracking')
@Controller('v1/track')
@UseGuards(OptionalJwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * POST /api/v1/track/event —— 单事件上报
   */
  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '上报单个埋点事件' })
  @ApiBearerAuth()
  async trackEvent(
    @Body() dto: TrackEventDto,
    @CurrentUser() user: JwtUserPayload | null,
    @Req() req: Request,
  ) {
    return this.trackingService.trackClient(dto, user, req);
  }

  /**
   * POST /api/v1/track/batch —— 批量事件上报
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量上报埋点事件（前端队列批量发送）' })
  @ApiBearerAuth()
  async trackBatch(
    @Body() dto: TrackBatchDto,
    @CurrentUser() user: JwtUserPayload | null,
    @Req() req: Request,
  ) {
    return this.trackingService.trackBatch(dto.events, user, req);
  }
}
