import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { MarketService } from './market.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';

class ExchangeDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;
}

@ApiTags('集市')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('items')
  @ApiOperation({ summary: '道具列表' })
  @ApiQuery({ name: 'category', required: false, enum: ['avatar', 'deco', 'boost'] })
  list(@Query('category') category?: 'avatar' | 'deco' | 'boost') {
    return this.marketService.listItems(category);
  }

  @Post('exchange')
  @ApiOperation({ summary: '兑换道具（金币扣减）' })
  exchange(@CurrentUser() current: JwtUserPayload, @Body() dto: ExchangeDto) {
    return this.marketService.exchange(current.sub, dto.itemId);
  }
}
