import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * 登录 DTO（V1.0：纯手机号 + 短信验证码）
 *
 * 流程：
 *  1. 前端 POST /auth/sms-code { phone, purpose: 'login' } 拿验证码
 *  2. 用户输入 6 位验证码 → 提交本 DTO
 *  3. 后端：校验 smsCode → 查 user → 签发 token
 */
export class LoginDto {
  @ApiProperty({ example: '13800138000', description: '中国大陆手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({ example: '654321', description: '6 位短信验证码' })
  @IsString()
  @Length(6, 6)
  smsCode!: string;
}
