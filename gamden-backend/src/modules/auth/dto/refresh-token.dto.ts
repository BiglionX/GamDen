import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'refresh token（登录接口返回）' })
  @IsString()
  refreshToken!: string;
}
