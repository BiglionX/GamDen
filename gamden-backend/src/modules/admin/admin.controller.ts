import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import {
  ListMiniProgramUsersDto,
  ListUserLogsDto,
  ManualAdvanceStatusDto,
  SendReminderDto,
} from './dto/mini-program-admin.dto';
import {
  CreateFaqDto,
  CreateTutorialDto,
  UpdateFaqDto,
  UpdateTutorialDto,
} from './dto/content.dto';

/**
 * Admin Controller —— 后台"小程序申请管理"路由
 *
 * 全部接口需 admin 角色（@Roles('admin') + 全局 RolesGuard）
 *
 * 路由前缀：/api/v1/admin
 * 子模块：
 *  - mini-program/*   用户申请管理
 *  - tutorials        教程 CRUD
 *  - faqs             FAQ CRUD
 */
@ApiTags('Admin · 小程序申请管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly contentService: ContentService,
  ) {}

  // ======================== 用户申请列表 / 统计 ========================

  @Get('mini-program/users')
  @ApiOperation({ summary: '用户申请状态列表（分页/筛选/搜索/排序）' })
  listUsers(@Query() query: ListMiniProgramUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('mini-program/stats/distribution')
  @ApiOperation({ summary: '各状态用户数量分布' })
  statusDistribution() {
    return this.adminService.getStatusDistribution();
  }

  @Get('mini-program/stats/funnel')
  @ApiOperation({ summary: '转化漏斗（解锁→开始→认证→部署→审核→上线）' })
  funnel() {
    return this.adminService.getFunnel();
  }

  // ======================== 单个用户详情 / 操作 ========================

  @Get('mini-program/users/:id')
  @ApiOperation({ summary: '单个用户申请详情' })
  userDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('mini-program/users/:id/advance')
  @ApiOperation({ summary: '手动推进状态（写操作日志）' })
  manualAdvance(
    @Param('id') id: string,
    @Body() dto: ManualAdvanceStatusDto,
    @CurrentUser() current: JwtUserPayload,
  ) {
    return this.adminService.manualAdvance(id, dto, {
      id: current.sub,
      nickname: current.role,
    });
  }

  @Post('mini-program/users/:id/remind')
  @ApiOperation({ summary: '向用户发送提醒推送' })
  sendReminder(
    @Param('id') id: string,
    @Body() dto: SendReminderDto,
    @CurrentUser() current: JwtUserPayload,
  ) {
    return this.adminService.sendReminder(id, dto, {
      id: current.sub,
      nickname: current.role,
    });
  }

  @Get('mini-program/users/:id/logs')
  @ApiOperation({ summary: '查询用户的操作日志' })
  userLogs(@Param('id') id: string, @Query() query: ListUserLogsDto) {
    return this.adminService.listUserLogs(id, query);
  }

  // ======================== 教程 CRUD ========================

  @Get('tutorials')
  @ApiOperation({ summary: '教程列表（含已停用需 includeInactive=true）' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  listTutorials(
    @Query('stage') stage?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.contentService.listTutorials({
      stage,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('tutorials/:id')
  @ApiOperation({ summary: '教程详情' })
  getTutorial(@Param('id') id: string) {
    return this.contentService.getTutorial(id);
  }

  @Post('tutorials')
  @ApiOperation({ summary: '创建教程' })
  createTutorial(@Body() dto: CreateTutorialDto) {
    return this.contentService.createTutorial(dto);
  }

  @Patch('tutorials/:id')
  @ApiOperation({ summary: '更新教程' })
  updateTutorial(@Param('id') id: string, @Body() dto: UpdateTutorialDto) {
    return this.contentService.updateTutorial(id, dto);
  }

  @Delete('tutorials/:id')
  @ApiOperation({ summary: '删除教程' })
  deleteTutorial(@Param('id') id: string) {
    return this.contentService.deleteTutorial(id);
  }

  // ======================== FAQ CRUD ========================

  @Get('faqs')
  @ApiOperation({ summary: 'FAQ 列表' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  listFaqs(
    @Query('stage') stage?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.contentService.listFaqs({
      stage,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('faqs/:id')
  @ApiOperation({ summary: 'FAQ 详情' })
  getFaq(@Param('id') id: string) {
    return this.contentService.getFaq(id);
  }

  @Post('faqs')
  @ApiOperation({ summary: '创建 FAQ' })
  createFaq(@Body() dto: CreateFaqDto) {
    return this.contentService.createFaq(dto);
  }

  @Patch('faqs/:id')
  @ApiOperation({ summary: '更新 FAQ' })
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.contentService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @ApiOperation({ summary: '删除 FAQ' })
  deleteFaq(@Param('id') id: string) {
    return this.contentService.deleteFaq(id);
  }
}
