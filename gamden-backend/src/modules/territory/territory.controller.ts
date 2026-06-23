import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TerritoryService } from './territory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';

/**
 * 经验来源枚举（与 TerritoryEvolution.unlockSource 对齐）
 */
export enum ExpSource {
  REGISTER = 'register',
  SIGNIN = 'signin',
  POST = 'post',
  INVITE = 'invite',
  UPGRADE = 'upgrade',
}

class UpgradeDto {
  @ApiProperty({ example: 50, description: '本次获得的经验值（正数）' })
  @IsInt()
  @IsPositive()
  @Max(10000)
  exp!: number;

  @ApiPropertyOptional({
    enum: ExpSource,
    example: ExpSource.SIGNIN,
    description: '经验来源（用于写入 evolution 记录）',
  })
  @IsOptional()
  @IsEnum(ExpSource)
  source?: ExpSource;
}

@ApiTags('领地')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('territory')
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  /**
   * 1. GET /api/territory/info
   * 当前用户领地详情
   */
  @Get('info')
  @ApiOperation({ summary: '获取当前用户领地详情' })
  async getMyInfo(@CurrentUser() current: JwtUserPayload) {
    const territory = await this.territoryService.findMyTerritory(current.sub);
    const evolutions = await this.territoryService.getEvolutionsByUser(current.sub);
    return { territory, evolutions };
  }

  /**
   * 2. GET /api/territory/nearby?x={x}&y={y}&range={range}
   * 按坐标查询周围邻居（前端地图渲染用，无需先查 territory id）
   */
  @Get('nearby')
  @ApiOperation({ summary: '按坐标查询周围邻居' })
  @ApiQuery({ name: 'x', required: true, type: Number, description: '中心 X 坐标' })
  @ApiQuery({ name: 'y', required: true, type: Number, description: '中心 Y 坐标' })
  @ApiQuery({ name: 'range', required: false, type: Number, example: 10, description: '查询半径（1-50）' })
  async nearby(
    @Query('x') x: string,
    @Query('y') y: string,
    @Query('range') range?: string,
  ) {
    const centerX = Number.parseInt(x, 10);
    const centerY = Number.parseInt(y, 10);
    if (Number.isNaN(centerX) || Number.isNaN(centerY)) {
      throw new BadRequestException('x 和 y 必须为整数');
    }
    const r = range ? Number.parseInt(range, 10) : 10;
    const territories = await this.territoryService.findNeighborsByCoords(
      centerX,
      centerY,
      r,
    );
    return {
      center: { x: centerX, y: centerY },
      range: r,
      total: territories.length,
      list: territories,
    };
  }

  /**
   * 3. POST /api/territory/upgrade
   * 领地升级（消耗 exp，达到阈值后升到下一级）
   * - Body: { exp: number, source?: 'signin'|'post'|... }
   * - 自动取当前用户的 territory，调用 service 完成升级
   */
  @Post('upgrade')
  @ApiOperation({ summary: '领地升级（消耗经验值）' })
  async upgrade(
    @CurrentUser() current: JwtUserPayload,
    @Body() dto: UpgradeDto,
  ) {
    const territory = await this.territoryService.findMyTerritory(current.sub);
    return this.territoryService.upgradeWithUnlocks(
      territory.id,
      dto.exp,
      dto.source ?? ExpSource.UPGRADE,
    );
  }

  /**
   * 4. GET /api/territory/exp/rules
   * 经验值获取规则
   */
  @Get('exp/rules')
  @ApiOperation({ summary: '经验值获取规则（签到/发帖/邀请等）' })
  expRules() {
    return this.territoryService.getExpRules();
  }
}
