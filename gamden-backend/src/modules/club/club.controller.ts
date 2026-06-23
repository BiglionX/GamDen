import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ClubService } from './club.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';

class CreateClubDto {
  @ApiProperty({ example: '原神·提瓦特茶摊' })
  @IsString()
  @Length(2, 128)
  name!: string;

  @ApiProperty({ example: '原神' })
  @IsString()
  @Length(2, 64)
  gameTag!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  description?: string;
}

@ApiTags('俱乐部')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  @ApiOperation({ summary: '俱乐部列表（按成员数倒序）' })
  list() {
    return this.clubService.list();
  }

  @Post()
  @ApiOperation({ summary: '创建俱乐部' })
  create(@CurrentUser() current: JwtUserPayload, @Body() dto: CreateClubDto) {
    return this.clubService.create({ ...dto, ownerId: current.sub });
  }

  @Get(':id')
  @ApiOperation({ summary: '俱乐部详情' })
  detail(@Param('id') id: string) {
    return this.clubService.findById(id);
  }
}
