import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
  UpdatePushSettingsDto,
} from './dto/push.dto';

/**
 * 推送管理 API
 * - 注册 / 注销 / 查询推送 token
 * - 用户推送开关
 *
 * 路由前缀：/api/v1/push
 */
@ApiTags('推送')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 注册推送 token
   * - 幂等：同一 token 不会重复添加
   * - 多端登录：每端一个 token
   */
  @Post('register')
  @ApiOperation({ summary: '注册推送 token（前端 App.vue 启动时调用）' })
  async register(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ ok: true; count: number }> {
    const user = await this.userRepo.findOne({
      where: { id: current.sub },
      select: ['id', 'pushTokens'],
    });
    if (!user) return { ok: true, count: 0 };

    const tokens = (user.pushTokens as string[] | null) ?? [];
    if (!tokens.includes(dto.token)) {
      tokens.push(dto.token);
      await this.userRepo.update({ id: user.id }, { pushTokens: tokens });
    }
    return { ok: true, count: tokens.length };
  }

  /**
   * 注销（批量）
   * - 用户在"设置"页关闭推送时调用
   */
  @Delete('unregister')
  @ApiOperation({ summary: '注销推送 token' })
  async unregister(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: UnregisterPushTokenDto,
  ): Promise<{ ok: true; count: number }> {
    const user = await this.userRepo.findOne({
      where: { id: current.sub },
      select: ['id', 'pushTokens'],
    });
    if (!user) return { ok: true, count: 0 };

    const remain = ((user.pushTokens as string[] | null) ?? []).filter(
      (t) => !dto.tokens.includes(t),
    );
    await this.userRepo.update({ id: user.id }, { pushTokens: remain });
    return { ok: true, count: remain.length };
  }

  /**
   * 查询我的 token 数量（调试用）
   */
  @Get('tokens')
  @ApiOperation({ summary: '查询我的推送 token 数量' })
  async getTokens(
    @CurrentUser() current: JwtUserPayload,
  ): Promise<{ count: number; pushEnabled: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: current.sub },
      select: ['id', 'pushTokens', 'pushEnabled'],
    });
    return {
      count: (user?.pushTokens as string[] | null)?.length ?? 0,
      pushEnabled: user?.pushEnabled ?? true,
    };
  }

  /**
   * 推送总开关
   * - 关闭后所有 PushService 调用都将被跳过
   */
  @Patch('settings')
  @ApiOperation({ summary: '更新推送总开关' })
  async updateSettings(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: UpdatePushSettingsDto,
  ): Promise<{ pushEnabled: boolean }> {
    await this.userRepo.update({ id: current.sub }, { pushEnabled: dto.enabled });
    return { pushEnabled: dto.enabled };
  }

  /**
   * 检查用户是否启用了推送（被 PushService 内部调用）
   * - V1.0 mock：所有 sendToUser 调用前会先检查此标志
   */
  @Get('check-enabled')
  @ApiOperation({ summary: '检查当前用户是否启用了推送' })
  async checkEnabled(
    @CurrentUser() current: JwtUserPayload,
  ): Promise<{ enabled: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: In([current.sub]) },
      select: ['id', 'pushEnabled'],
    });
    return { enabled: user?.pushEnabled ?? true };
  }
}
