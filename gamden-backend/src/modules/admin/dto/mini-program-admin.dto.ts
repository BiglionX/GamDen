import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  CertificationType,
  MiniProgramStatus,
} from '../../../entities/user-mini-program.entity';

/**
 * 小程序申请用户列表查询 DTO
 *
 * 支持：
 *  - 状态筛选（status）
 *  - 主体类型筛选（certificationType）
 *  - 时间范围（unlockedFrom / unlockedTo：基于 qualificationUnlockedAt）
 *  - 关键字搜索（keyword：用户昵称 / 手机号 / userId 精确匹配）
 *  - 排序（sortBy：createdAt | unlockedAt | onlineAt）
 *  - 排序方向（order：asc | desc，默认 desc）
 */
const SORTABLE_FIELDS = [
  'createdAt',
  'unlockedAt',
  'onlineAt',
  'updatedAt',
] as const;

export type ListSortBy = (typeof SORTABLE_FIELDS)[number];

export class ListMiniProgramUsersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '状态筛选（不传则全部）',
    enum: [
      'not_started',
      'certifying',
      'certified',
      'deploying',
      'reviewing',
      'online',
    ],
  })
  @IsOptional()
  @IsString()
  status?: MiniProgramStatus;

  @ApiPropertyOptional({
    description: '主体类型筛选',
    enum: ['individual', 'enterprise'],
  })
  @IsOptional()
  @IsString()
  certificationType?: CertificationType;

  @ApiPropertyOptional({ description: '按用户昵称 / userId 模糊搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: SORTABLE_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: ListSortBy = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: '仅看已解锁用户（默认 false）' })
  @IsOptional()
  @Type(() => Boolean)
  unlockedOnly?: boolean;
}

/**
 * 单个列表行 VO
 */
export class MiniProgramUserListItemVo {
  @ApiProperty({ description: '用户 ID' })
  userId!: string;

  @ApiProperty({ description: '用户昵称' })
  nickname!: string;

  @ApiProperty({ description: '手机号（脱敏）' })
  phoneMasked!: string;

  @ApiProperty({ description: '小程序申请状态' })
  status!: MiniProgramStatus;

  @ApiPropertyOptional({ description: '主体类型' })
  certificationType?: CertificationType | null;

  @ApiPropertyOptional({ description: 'AppID（脱敏）' })
  appidMasked?: string | null;

  @ApiPropertyOptional({ description: '获得资格时间' })
  qualificationUnlockedAt?: Date | null;

  @ApiPropertyOptional({ description: '认证提交时间' })
  certSubmittedAt?: Date | null;

  @ApiPropertyOptional({ description: 'AppID 提交时间' })
  appidSubmittedAt?: Date | null;

  @ApiPropertyOptional({ description: '代码提交审核时间' })
  codeSubmittedAt?: Date | null;

  @ApiPropertyOptional({ description: '上线时间' })
  onlineAt?: Date | null;

  @ApiPropertyOptional({ description: '小程序申请记录创建时间' })
  createdAt?: Date;
}

/**
 * 用户详情 VO（包含所有时间戳、appid 脱敏、操作历史摘要）
 */
export class MiniProgramUserDetailVo extends MiniProgramUserListItemVo {
  @ApiPropertyOptional({ description: '自定义小程序名称' })
  customName?: string | null;

  @ApiPropertyOptional({ description: '小程序码 URL' })
  qrCodeUrl?: string | null;

  @ApiProperty({ description: '邀请人数' })
  invitedCount!: number;

  @ApiProperty({ description: '最后登录时间' })
  lastLoginAt?: Date | null;
}

/**
 * 手动推进状态 DTO
 */
export class ManualAdvanceStatusDto {
  @ApiProperty({
    description: '目标状态（admin 可推进到任意合法下一状态）',
    enum: [
      'not_started',
      'certifying',
      'certified',
      'deploying',
      'reviewing',
      'online',
    ],
  })
  @IsString()
  toStatus!: MiniProgramStatus;

  @ApiPropertyOptional({
    description: '认证主体类型（推进到 certifying / certified 时必填）',
    enum: ['individual', 'enterprise'],
  })
  @IsOptional()
  @IsString()
  certificationType?: CertificationType;

  @ApiPropertyOptional({ description: '操作备注 / 原因' })
  @IsOptional()
  @IsString()
  remark?: string;

  /**
   * 强制覆盖（admin 专用，绕过状态机校验）
   * - V1.0 默认 false，要求状态机合法
   */
  @ApiPropertyOptional({ description: '是否强制覆盖（绕过状态机校验）' })
  @IsOptional()
  @Type(() => Boolean)
  force?: boolean;
}

/**
 * 发送提醒 DTO
 */
export const REMINDER_SCENES = [
  'mini_program_unlocked',
  'mini_program_certified',
  'mini_program_online',
  'mini_program_stale',
  'custom',
] as const;

export type ReminderScene = (typeof REMINDER_SCENES)[number];

export class SendReminderDto {
  @ApiProperty({
    description: '推送场景',
    enum: REMINDER_SCENES,
  })
  @IsIn(REMINDER_SCENES)
  scene!: ReminderScene;

  @ApiPropertyOptional({ description: '自定义推送标题（scene=custom 时必填）' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '自定义推送内容（scene=custom 时必填）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '备注（运营内部原因）' })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 用户操作日志查询 DTO
 */
export class ListUserLogsDto extends PaginationDto {
  @ApiPropertyOptional({ description: '操作类型筛选' })
  @IsOptional()
  @IsString()
  action?: string;
}

/**
 * 单条日志 VO
 */
export class MiniProgramLogVo {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() actorId?: string | null;
  @ApiPropertyOptional() actorName?: string | null;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() userNickname?: string | null;
  @ApiProperty() action!: string;
  @ApiPropertyOptional() fromStatus?: MiniProgramStatus | null;
  @ApiPropertyOptional() toStatus?: MiniProgramStatus | null;
  @ApiPropertyOptional() remark?: string | null;
  @ApiPropertyOptional() extra?: Record<string, unknown> | null;
  @ApiProperty() createdAt!: Date;
}

/**
 * 状态分布统计 VO
 */
export class StatusDistributionVo {
  @ApiProperty({ description: '状态 -> 用户数' })
  distribution!: Record<MiniProgramStatus, number>;

  @ApiProperty({ description: '总用户数（已解锁）' })
  totalUnlocked!: number;

  @ApiProperty({ description: '未解锁用户数（邀请 < 3）' })
  totalLocked!: number;
}

/**
 * 转化漏斗 VO
 */
export class FunnelVo {
  @ApiProperty() unlocked!: number;
  @ApiProperty() startedApply!: number;     // certifying 之后
  @ApiProperty() certified!: number;        // certified 之后
  @ApiProperty() deploying!: number;        // deploying 之后
  @ApiProperty() reviewing!: number;        // reviewing 之后
  @ApiProperty() online!: number;           // online 之后

  @ApiProperty({ description: '各阶段转化率（百分比，保留 2 位）' })
  conversion!: {
    unlockedToApply: number;
    applyToCertified: number;
    certifiedToDeploying: number;
    deployingToReviewing: number;
    reviewingToOnline: number;
    unlockedToOnline: number;
  };
}

/**
 * Path 参数校验：UUID
 */
export class UserIdParamDto {
  @ApiProperty()
  @IsUUID()
  id!: string;
}

/**
 * admin 路由的 path 数字校验（pageSize / page 等）
 * 实际未使用，作为模板保留
 */
export class IntParamDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  value!: number;
}
