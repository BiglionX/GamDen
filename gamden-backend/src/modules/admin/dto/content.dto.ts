import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TutorialStage, TutorialType } from '../../../entities/tutorial.entity';
import { FaqStage } from '../../../entities/faq.entity';

const STAGES: TutorialStage[] = ['apply', 'appid', 'review', 'online', 'general'];
const TYPES: TutorialType[] = ['article', 'video'];

/**
 * 教程 DTO（创建）
 */
export class CreateTutorialDto {
  @ApiProperty({ enum: STAGES, default: 'general' })
  @IsEnum(STAGES)
  stage!: TutorialStage;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  title!: string;

  @ApiProperty({ enum: TYPES, default: 'article' })
  @IsEnum(TYPES)
  type!: TutorialType;

  @ApiProperty({ maxLength: 512, description: '外链 URL' })
  @IsString()
  @IsUrl({ require_protocol: true }, { message: 'url 必须是带协议的合法 URL' })
  url!: string;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ default: 1000, minimum: 0, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number = 1000;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean = true;
}

/**
 * 教程 DTO（更新）
 * - 全部字段可选
 */
export class UpdateTutorialDto {
  @ApiPropertyOptional({ enum: STAGES })
  @IsOptional()
  @IsEnum(STAGES)
  stage?: TutorialStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: TYPES })
  @IsOptional()
  @IsEnum(TYPES)
  type?: TutorialType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * FAQ DTO（创建）
 */
export class CreateFaqDto {
  @ApiProperty({ enum: STAGES, default: 'general' })
  @IsEnum(STAGES)
  stage!: FaqStage;

  @ApiProperty({ maxLength: 256 })
  @IsString()
  question!: string;

  @ApiProperty({ description: '纯文本 / 简单 markdown' })
  @IsString()
  answer!: string;

  @ApiPropertyOptional({ default: 1000, minimum: 0, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number = 1000;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean = true;
}

/**
 * FAQ DTO（更新）
 */
export class UpdateFaqDto {
  @ApiPropertyOptional({ enum: STAGES })
  @IsOptional()
  @IsEnum(STAGES)
  stage?: FaqStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
