import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';

class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 24 })
  @IsOptional()
  @IsString()
  @Length(2, 24)
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@ApiTags('用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async me(@CurrentUser() current: JwtUserPayload) {
    return this.userService.findById(current.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新昵称 / 头像' })
  async updateMe(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(current.sub, dto);
  }
}
