import { ApiProperty } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({ description: 'GamDen access token，2 小时有效期' })
  accessToken!: string;

  @ApiProperty({ description: 'GamDen refresh token，14 天有效期' })
  refreshToken!: string;

  @ApiProperty({ example: 7200, description: 'GamDen access token 过期秒数' })
  expiresIn!: number;

  @ApiProperty({
    description: 'OpenIM 用户 ID（与 GamDen userId 一致）',
    required: false,
  })
  imUserId?: string;

  @ApiProperty({
    description: 'OpenIM 登录 token（前端 SDK 登录用，7 天有效期）',
    required: false,
  })
  imToken?: string;

  @ApiProperty({
    example: 604800,
    description: 'IM token 过期秒数',
    required: false,
  })
  imExpiresIn?: number;

  @ApiProperty({
    description: 'IM token 过期时间戳（秒）',
    required: false,
  })
  imExpireTime?: number;
}
