import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Matches } from 'class-validator';

export enum SmsPurpose {
  REGISTER = 'register',
  LOGIN = 'login',
}

export class SendSmsDto {
  @ApiProperty({ example: '13800138000', description: '中国大陆手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({
    enum: SmsPurpose,
    example: SmsPurpose.LOGIN,
    description: '验证码用途：register=注册验证手机号 / login=登录',
  })
  @IsEnum(SmsPurpose)
  purpose!: SmsPurpose;
}
