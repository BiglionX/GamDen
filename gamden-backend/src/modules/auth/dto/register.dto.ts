import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { GuardianType } from '../../../entities/user.entity';

/**
 * 注册 DTO（V1.0 改为纯手机号 + 短信验证码）
 *
 * 流程：
 *  1. 前端先 POST /auth/sms-code { phone, purpose: 'register' } 拿验证码
 *  2. 用户输入 6 位验证码 + 邀请码 + 守护灵选择 → 提交本 DTO
 *  3. 后端：校验 smsCode → 校验 inviteCode → 创建 user → 分配领地 → 签发 token
 */
export class RegisterDto {
  @ApiProperty({ example: '巢友9527', description: '昵称，2-24 字符' })
  @IsString()
  @Length(2, 24)
  nickname!: string;

  @ApiProperty({ example: '13800138000', description: '中国大陆手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({ example: '654321', description: '6 位短信验证码' })
  @IsString()
  @Length(6, 6)
  smsCode!: string;

  @ApiProperty({ example: 'mechanical', enum: ['mechanical', 'elf', 'astrologer'] })
  @IsEnum(['mechanical', 'elf', 'astrologer'])
  guardianType!: GuardianType;

  @ApiProperty({ example: 'ABCD1234', description: '邀请码' })
  @IsString()
  @Length(6, 32)
  inviteCode!: string;
}
