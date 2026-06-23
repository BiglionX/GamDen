import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

import { MiniProgramService } from './mini-program.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import { CertificationType } from '../../entities/user-mini-program.entity';
import { TrackingService } from '../tracking/tracking.service';

/**
 * 教程查看 DTO —— guide_type 表示"哪一步"的教程
 * - apply      申请认证步骤
 * - appid      提交 AppID 步骤
 * - review     代码审核步骤
 * - online     上线步骤
 */
class TrackTutorialViewDto {
  @ApiProperty({
    example: 'apply',
    description: '教程类型：apply / appid / review / online',
  })
  @IsString()
  guideType!: string;
}

/**
 * 认证主体类型枚举（DTO 用 class-validator 需要可运行时枚举的值数组）
 */
const CERTIFICATION_TYPE_VALUES: CertificationType[] = [
  'individual',
  'enterprise',
];

/**
 * 申请 DTO —— 用户开始申请，选择主体类型
 */
class ApplyDto {
  @ApiProperty({
    example: 'individual',
    enum: CERTIFICATION_TYPE_VALUES,
    description: '认证主体类型：individual 个人主体 / enterprise 企业个体工商户',
  })
  @IsEnum(CERTIFICATION_TYPE_VALUES)
  certificationType!: CertificationType;
}

/**
 * 提交 AppID DTO
 */
class SubmitAppidDto {
  @ApiProperty({
    example: 'wx1234567890abcdef',
    description: '微信小程序 AppID，wx 开头的 18 位字符串',
  })
  @IsString()
  appid!: string;

  @ApiProperty({
    example: 'abcdef1234567890abcdef1234567890',
    description: '微信小程序 AppSecret（32 位字符串），用于后端调用微信 API（小程序码、审核等）',
  })
  @IsString()
  appSecret!: string;
}

/**
 * 用户自主小程序申请与部署
 *
 * 完整路由前缀：/api/v1/mini-program/*
 * 所有接口均需 JWT 鉴权（除 tutorials 可扩展为公开）
 */
@ApiTags('小程序申请')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mini-program')
export class MiniProgramController {
  constructor(
    private readonly miniProgramService: MiniProgramService,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * 1. GET /api/v1/mini-program/status
   * 获取当前用户的申请状态
   * - 返回状态枚举、各阶段时间戳、小程序码 URL、自定义名称等
   * - 未解锁资格时返回 null
   */
  @Get('status')
  @ApiOperation({ summary: '获取当前用户的小程序申请状态' })
  async getStatus(@CurrentUser() current: JwtUserPayload) {
    const data = await this.miniProgramService.getStatus(current.sub);
    return data;
  }

  /**
   * 2. POST /api/v1/mini-program/apply
   * 用户开始申请（记录 certification_type）
   * - 将状态从 not_started 更新为 certifying
   * - 记录 cert_submitted_at
   */
  @Post('apply')
  @ApiOperation({ summary: '开始申请（提交认证主体类型）' })
  async apply(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: ApplyDto,
  ) {
    return this.miniProgramService.apply(current.sub, dto.certificationType);
  }

  /**
   * 3. POST /api/v1/mini-program/appid
   * 用户提交 AppID
   * - 校验 AppID 格式（wx + 16 位十六进制）
   * - 通过微信开放平台 API 实时校验 AppID + AppSecret 是否有效
   * - 将状态从 certified 更新为 deploying
   * - 记录 appid_submitted_at
   * - AppSecret 加密存储，不会回传给前端
   */
  @Post('appid')
  @ApiOperation({ summary: '提交小程序 AppID（实时校验有效性）' })
  async submitAppid(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: SubmitAppidDto,
  ) {
    return this.miniProgramService.submitAppid(
      current.sub,
      dto.appid,
      dto.appSecret,
    );
  }

  /**
   * 4. POST /api/v1/mini-program/confirm-reviewing
   * 确认代码审核中（用户确认或系统自动触发）
   * - 将状态从 deploying 更新为 reviewing
   * - 记录 code_submitted_at
   */
  @Post('confirm-reviewing')
  @ApiOperation({ summary: '确认代码已提交审核' })
  async confirmReviewing(@CurrentUser() current: JwtUserPayload) {
    return this.miniProgramService.confirmReviewing(current.sub);
  }

  /**
   * 5. POST /api/v1/mini-program/confirm-online
   * 确认已上线（用户确认或系统自动触发）
   * - 将状态从 reviewing 更新为 online
   * - 记录 online_at，生成小程序码
   * - 状态推进后触发推送：🎊 你的小程序已上线！
   */
  @Post('confirm-online')
  @ApiOperation({ summary: '确认小程序已上线（生成小程序码）' })
  async confirmOnline(@CurrentUser() current: JwtUserPayload) {
    return this.miniProgramService.confirmOnline(current.sub);
  }

  /**
   * 5.5 POST /api/v1/mini-program/notify-certified  [V1.0 mock]
   * 通知后端"微信认证已通过"（certifying → certified）
   * - V1.0 mock：暂时暴露给登录用户手动触发，便于联调
   * - V1.1 接入微信开放平台 webhook 后，此端点仅 admin 可见
   * - 状态推进后触发推送：✅ 你的小程序认证已通过
   */
  @Post('notify-certified')
  @ApiOperation({
    summary: '[V1.0 mock] 通知"微信认证已通过"（certifying → certified）',
  })
  async notifyCertified(@CurrentUser() current: JwtUserPayload) {
    return this.miniProgramService.markAsCertified(current.sub);
  }

  /**
   * 6. POST /api/v1/mini-program/abandon
   * 用户放弃申请
   * - 重置状态为 not_started
   * - 清空 certification_type / appid / 各阶段时间戳 / qr_code_url
   * - 保留 qualification_unlocked_at（资格不丢失）
   */
  @Post('abandon')
  @ApiOperation({ summary: '放弃申请（重置状态）' })
  async abandon(@CurrentUser() current: JwtUserPayload) {
    return this.miniProgramService.abandon(current.sub);
  }

  /**
   * 7. GET /api/v1/mini-program/tutorials
   * 获取教程列表（图文/视频链接）
   * - V1.0 返回静态教程数据
   */
  @Get('tutorials')
  @ApiOperation({ summary: '获取小程序申请部署教程列表' })
  getTutorials(@CurrentUser() current: JwtUserPayload) {
    // 埋点：mp_guide_viewed（用户查看教程总览）
    void this.trackingService.trackServer('mp_guide_viewed', {
      userId: current.sub,
      properties: { guide_type: 'overview' },
    });
    return this.miniProgramService.getTutorials();
  }

  /**
   * 7.5 POST /api/v1/mini-program/track/guide-viewed
   * 记录用户查看了"某一步"的教程
   * - 前端在 HelpCenterSheet 切换到对应 Tab 时调用
   * - 用于统计哪些步骤用户最频繁查看
   */
  @Post('track/guide-viewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '记录用户查看某一步教程' })
  trackGuideViewed(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: TrackTutorialViewDto,
  ) {
    void this.trackingService.trackServer('mp_guide_viewed', {
      userId: current.sub,
      properties: { guide_type: dto.guideType },
    });
    return { ok: true };
  }
}
