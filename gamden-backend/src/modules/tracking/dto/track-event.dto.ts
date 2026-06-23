import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 单个埋点事件 DTO
 *
 * 设计原则：
 *  - eventName 强约束（前端用 track() 工具包装，不允许拼字符串）
 *  - properties 灵活对象（不同事件有不同的附加字段）
 *  - platform / pageUrl 由前端透传
 */
export class TrackEventDto {
  @ApiProperty({
    description: '事件名（推荐使用 utils/track.ts 中导出的 TrackEvent 常量）',
    example: 'mp_qualification_unlocked',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  eventName!: string;

  @ApiPropertyOptional({
    description: '业务附加字段',
    example: { invite_count: 3 },
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '当前页面路径（前端透传，便于漏斗分析）',
    example: '/pages/invite/mini-program',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pageUrl?: string;

  @ApiPropertyOptional({
    description: '客户端平台',
    example: 'mp-weixin',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;
}

/**
 * 批量埋点事件 DTO（前端队列批量上报）
 */
export class TrackBatchDto {
  @ApiProperty({ description: '事件列表', type: [TrackEventDto] })
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}

/**
 * 服务端埋点 DTO（内部 service 调用，跳过 userId 校验，由调用方传入）
 *
 * 用法：
 *   trackingService.trackServer('mp_qualification_unlocked', userId, { invite_count: 3 }, req);
 */
export interface ServerTrackOptions {
  userId?: string | null;
  deviceId?: string | null;
  properties?: Record<string, unknown>;
  pageUrl?: string | null;
  platform?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
