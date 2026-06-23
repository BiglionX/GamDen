import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

import { ImService } from './im.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import { UserService } from '../user/user.service';

class RefreshTokenDto {
  @ApiProperty({ description: 'IM token（用于服务端校验或日志）', required: false })
  imToken?: string;
}

class IMStatusDto {
  @ApiProperty()
  imUserId!: string;

  @ApiProperty()
  connected!: boolean;
}

class ForceLogoutDto {
  @ApiProperty({ description: '目标平台：0=全平台 1=Android 2=iOS 3=Web 5=miniProgram' })
  platform!: number;
}

@ApiTags('IM 即时通讯')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('im')
export class ImController {
  constructor(
    private readonly imService: ImService,
    private readonly userService: UserService,
  ) {}

  /**
   * 获取 IM 连接状态 + 当前 token 剩余有效期
   */
  @Post('status')
  @HttpCode(200)
  @ApiOperation({ summary: '获取 IM 状态' })
  async status(@CurrentUser() current: JwtUserPayload): Promise<IMStatusDto> {
    const user = await this.userService.findById(current.sub);
    return {
      imUserId: user.id,
      connected: true,
    };
  }

  /**
   * 刷新 IM token（在即将过期时由前端调用）
   */
  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 IM token' })
  async refreshToken(
    @CurrentUser() current: JwtUserPayload,
    @Body() _dto: RefreshTokenDto,
  ) {
    const user = await this.userService.findById(current.sub);
    return this.imService.getToken(user);
  }

  /**
   * 强制下线（业务登出后调）
   * - OpenIM 服务端：调 /auth/force_logout 强制该用户所有端下线
   */
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'IM 登出（强制下线）' })
  async logout(
    @CurrentUser() current: JwtUserPayload,
    @Body() _dto: ForceLogoutDto,
  ): Promise<{ ok: true }> {
    return this.imService.forceLogout(current.sub);
  }

  /**
   * 同步用户信息到 IM（昵称/头像变更后调用）
   */
  @Post('sync-user')
  @HttpCode(200)
  @ApiOperation({ summary: '同步用户信息到 IM' })
  async syncUser(@CurrentUser() current: JwtUserPayload): Promise<{ ok: true }> {
    const user = await this.userService.findById(current.sub);
    await this.imService.createUser(user); // createUser 即更新（OpenIM 内部 upsert）
    return { ok: true };
  }
}