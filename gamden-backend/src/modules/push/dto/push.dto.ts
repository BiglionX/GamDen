import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 注册推送 token DTO
 * - 前端 App.vue 启动时调用
 * - token 来自 uni.getPushClientId()（V1.1+ 接 unipush 后才有值）
 */
export class RegisterPushTokenDto {
  @ApiProperty({ description: 'uni-push 个推 CID（V1.0 mock 可传任意字符串）' })
  @IsString()
  @MaxLength(256)
  token!: string;

  @ApiProperty({ description: '平台：ios | android | mp-weixin | h5', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @ApiProperty({ description: '设备型号 / 小程序 appid', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceInfo?: string;
}

/**
 * 批量注销 token DTO
 */
export class UnregisterPushTokenDto {
  @ApiProperty({ description: '要移除的 token', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tokens!: string[];
}

/**
 * 推送开关 DTO
 */
export class UpdatePushSettingsDto {
  @ApiProperty({ description: '是否启用推送' })
  @IsBoolean()
  enabled!: boolean;
}
