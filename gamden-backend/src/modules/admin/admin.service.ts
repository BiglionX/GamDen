import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { User, UserRole } from '../../entities/user.entity';
import { UserMiniProgram } from '../../entities/user-mini-program.entity';
import { MiniProgramLog } from '../../entities/mini-program-log.entity';
import {
  CertificationType,
  MiniProgramStatus,
} from '../../entities/user-mini-program.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { PushService, PushScene } from '../push/push.service';
import { TrackingService } from '../tracking/tracking.service';
import {
  FunnelVo,
  ListMiniProgramUsersDto,
  ListUserLogsDto,
  ManualAdvanceStatusDto,
  MiniProgramLogVo,
  MiniProgramUserDetailVo,
  MiniProgramUserListItemVo,
  ReminderScene,
  SendReminderDto,
  StatusDistributionVo,
} from './dto/mini-program-admin.dto';

/** 解锁自主小程序所需邀请人数（与 MiniProgramService 保持一致） */
const MINI_PROGRAM_UNLOCK_THRESHOLD = 3;

/** AppID 脱敏：保留前 4 后 4 */
function maskAppid(appid: string): string {
  if (!appid || appid.length <= 8) return appid ? '****' : '';
  return `${appid.slice(0, 4)}****${appid.slice(-4)}`;
}

/** 手机号脱敏：138****1234 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

const STATUS_LABELS: Record<MiniProgramStatus, string> = {
  not_started: '未开始',
  certifying: '认证中',
  certified: '认证通过',
  deploying: '待部署',
  reviewing: '代码审核中',
  online: '已上线',
};

/**
 * 状态排序规则（按生命周期顺序）
 */
const STATUS_ORDER: Record<MiniProgramStatus, number> = {
  not_started: 0,
  certifying: 1,
  certified: 2,
  deploying: 3,
  reviewing: 4,
  online: 5,
};

/**
 * 合法状态机（admin 强制覆盖时可绕过）
 */
const ALLOWED_TRANSITIONS: Readonly<Record<MiniProgramStatus, readonly MiniProgramStatus[]>> = {
  not_started: ['certifying'],
  certifying: ['certified'],
  certified: ['deploying'],
  deploying: ['reviewing'],
  reviewing: ['online'],
  online: [],
};

/**
 * AdminService —— 后台运营对"小程序申请"的管理
 *
 * 主要职责：
 *  1. 用户申请状态列表（分页 / 筛选 / 搜索 / 排序）
 *  2. 状态分布统计 + 转化漏斗
 *  3. 单个用户详情（VO 聚合 user + miniProgram + 邀请人数）
 *  4. 手动推进状态（绕过 / 不绕过状态机）
 *  5. 发送提醒推送（基于 PushService）
 *  6. 操作日志查询
 *
 * 设计原则：
 *  - 全部接口需 admin 角色（在 Controller 用 @Roles('admin') 守卫）
 *  - 写操作（推进 / 提醒）必须落 MiniProgramLog
 *  - 不修改 MiniProgramService 的原有公开方法；扩展由 admin 专用方法实现
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserMiniProgram)
    private readonly miniProgramRepo: Repository<UserMiniProgram>,
    @InjectRepository(MiniProgramLog)
    private readonly logRepo: Repository<MiniProgramLog>,
    private readonly pushService: PushService,
    private readonly trackingService: TrackingService,
  ) {}

  // ======================== 列表 ========================

  /**
   * 分页查询用户申请状态
   * - 通过 user.id LEFT JOIN user_mini_programs
   * - 未达邀请阈值的用户也展示，状态用 'locked'（不在 MiniProgramStatus 枚举内）
   *   → 为不污染实体枚举，转换为 status = null + unlocked = false 的标记
   */
  async listUsers(
    query: ListMiniProgramUsersDto,
  ): Promise<PaginatedResult<MiniProgramUserListItemVo>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'desc';
    const orderDir: 'ASC' | 'DESC' = order === 'asc' ? 'ASC' : 'DESC';

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoin(UserMiniProgram, 'mp', 'mp.user_id = u.id')
      .select([
        'u.id AS user_id',
        'u.nickname AS nickname',
        'u.phone AS phone',
        'u.invited_count AS invited_count',
        'u.last_login_at AS last_login_at',
        'u.created_at AS user_created_at',
        'u.updated_at AS user_updated_at',
        'mp.status AS status',
        'mp.certification_type AS certification_type',
        'mp.appid AS appid',
        'mp.qualification_unlocked_at AS qualification_unlocked_at',
        'mp.cert_submitted_at AS cert_submitted_at',
        'mp.appid_submitted_at AS appid_submitted_at',
        'mp.code_submitted_at AS code_submitted_at',
        'mp.online_at AS online_at',
        'mp.created_at AS mp_created_at',
      ])
      .where('u.role = :role', { role: 'registered' });

    if (query.status) {
      qb.andWhere('mp.status = :status', { status: query.status });
    }
    if (query.certificationType) {
      qb.andWhere('mp.certification_type = :ct', {
        ct: query.certificationType,
      });
    }
    if (query.unlockedOnly) {
      qb.andWhere('u.invited_count >= :threshold', {
        threshold: MINI_PROGRAM_UNLOCK_THRESHOLD,
      });
    } else {
      // 默认排除"已解锁但 record 仍为 null"的边界态（通常不存在）
      // 不做额外过滤，让管理员能看见"邀请 < 3 尚未解锁"的用户
    }

    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('u.nickname ILIKE :kw', { kw }).orWhere(
            'u.id::text = :exactId',
            { exactId: query.keyword },
          );
        }),
      );
    }

    // 排序：允许的字段映射到对应列
    const sortMap: Record<string, string> = {
      createdAt: 'u.created_at',
      updatedAt: 'u.updated_at',
      unlockedAt: 'mp.qualification_unlocked_at',
      onlineAt: 'mp.online_at',
    };
    const sortColumn = sortMap[sortBy] ?? 'u.created_at';
    qb.orderBy(sortColumn, orderDir).addOrderBy('u.id', 'ASC');

    qb.skip((page - 1) * pageSize).take(pageSize);

    const rawRows = await qb.getRawMany<Record<string, unknown>>();
    const total = await qb.getCount();

    const list: MiniProgramUserListItemVo[] = rawRows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        userId: String(row.user_id),
        nickname: String(row.nickname ?? ''),
        phoneMasked: maskPhone(String(row.phone ?? '')),
        status:
          (row.status as MiniProgramStatus | null) ??
          ('not_started' as MiniProgramStatus),
        certificationType:
          (row.certification_type as CertificationType | null) ?? null,
        appidMasked: row.appid ? maskAppid(String(row.appid)) : null,
        qualificationUnlockedAt: toDateOrNull(row.qualification_unlocked_at),
        certSubmittedAt: toDateOrNull(row.cert_submitted_at),
        appidSubmittedAt: toDateOrNull(row.appid_submitted_at),
        codeSubmittedAt: toDateOrNull(row.code_submitted_at),
        onlineAt: toDateOrNull(row.online_at),
        createdAt:
          toDateOrNull(row.mp_created_at) ??
          toDateOrNull(row.user_created_at) ??
          undefined,
      } satisfies MiniProgramUserListItemVo;
    });

    return { list, total, page, pageSize };
  }

  // ======================== 统计 ========================

  /**
   * 状态分布
   * - 已解锁用户：状态分布按 MiniProgramStatus
   * - 未解锁用户：单独计数（不计入 6 个状态）
   */
  async getStatusDistribution(): Promise<StatusDistributionVo> {
    const rows = await this.miniProgramRepo
      .createQueryBuilder('mp')
      .select('mp.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('mp.status')
      .getRawMany<{ status: MiniProgramStatus; count: string }>();

    const distribution: Record<MiniProgramStatus, number> = {
      not_started: 0,
      certifying: 0,
      certified: 0,
      deploying: 0,
      reviewing: 0,
      online: 0,
    };
    for (const r of rows) {
      if (r.status && r.status in distribution) {
        distribution[r.status] = parseInt(r.count, 10) || 0;
      }
    }

    const totalUnlocked = await this.userRepo.count({
      where: { invitedCount: () => '>= ' + MINI_PROGRAM_UNLOCK_THRESHOLD } as never,
    }).catch(() => 0);

    // 上面的写法在 typeorm 0.3 不可靠；改用更稳的方式
    const totalUnlocked2 = await this.userRepo
      .createQueryBuilder('u')
      .where('u.invited_count >= :t', { t: MINI_PROGRAM_UNLOCK_THRESHOLD })
      .getCount();

    const totalUsers = await this.userRepo.count({
      where: { role: 'registered' as UserRole },
    });

    return {
      distribution,
      totalUnlocked: totalUnlocked2,
      totalLocked: Math.max(0, totalUsers - totalUnlocked2),
    };
  }

  /**
   * 转化漏斗
   *   unlocked → startedApply → certified → deploying → reviewing → online
   *
   * 状态节点定义（>= 表示已进入该阶段或后续阶段）：
   *   unlocked       已解锁（invited_count >= 3）
   *   startedApply   状态 >= certifying
   *   certified      状态 >= certified
   *   deploying      状态 >= deploying
   *   reviewing      状态 >= reviewing
   *   online         状态 = online
   */
  async getFunnel(): Promise<FunnelVo> {
    const countByStatus = await this.miniProgramRepo
      .createQueryBuilder('mp')
      .select('mp.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('mp.status')
      .getRawMany<{ status: MiniProgramStatus; count: string }>();

    const dist: Record<MiniProgramStatus, number> = {
      not_started: 0,
      certifying: 0,
      certified: 0,
      deploying: 0,
      reviewing: 0,
      online: 0,
    };
    for (const r of countByStatus) {
      dist[r.status] = parseInt(r.count, 10) || 0;
    }

    const unlocked = await this.userRepo
      .createQueryBuilder('u')
      .where('u.invited_count >= :t', { t: MINI_PROGRAM_UNLOCK_THRESHOLD })
      .getCount();

    // 状态 >= X 的累计：所有到达该阶段（含后续阶段）的人数
    const startedApply =
      dist.certifying + dist.certified + dist.deploying + dist.reviewing + dist.online;
    const certified = dist.certified + dist.deploying + dist.reviewing + dist.online;
    const deploying = dist.deploying + dist.reviewing + dist.online;
    const reviewing = dist.reviewing + dist.online;
    const online = dist.online;

    const pct = (num: number, denom: number): number => {
      if (denom <= 0) return 0;
      return Math.round((num / denom) * 10000) / 100; // 2 位小数
    };

    return {
      unlocked,
      startedApply,
      certified,
      deploying,
      reviewing,
      online,
      conversion: {
        unlockedToApply: pct(startedApply, unlocked),
        applyToCertified: pct(certified, startedApply),
        certifiedToDeploying: pct(deploying, certified),
        deployingToReviewing: pct(reviewing, deploying),
        reviewingToOnline: pct(online, reviewing),
        unlockedToOnline: pct(online, unlocked),
      },
    };
  }

  // ======================== 详情 ========================

  /**
   * 单个用户详情（VO 聚合）
   */
  async getUserDetail(userId: string): Promise<MiniProgramUserDetailVo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const mp = await this.miniProgramRepo.findOne({ where: { userId } });

    return {
      userId: user.id,
      nickname: user.nickname,
      phoneMasked: maskPhone(user.phone),
      status: mp?.status ?? 'not_started',
      certificationType: mp?.certificationType ?? null,
      appidMasked: mp?.appid ? maskAppid(mp.appid) : null,
      customName: mp?.customName ?? null,
      qrCodeUrl: mp?.qrCodeUrl ?? null,
      invitedCount: user.invitedCount ?? 0,
      qualificationUnlockedAt: mp?.qualificationUnlockedAt ?? null,
      certSubmittedAt: mp?.certSubmittedAt ?? null,
      appidSubmittedAt: mp?.appidSubmittedAt ?? null,
      codeSubmittedAt: mp?.codeSubmittedAt ?? null,
      onlineAt: mp?.onlineAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: mp?.createdAt ?? user.createdAt,
    };
  }

  // ======================== 状态推进 ========================

  /**
   * 手动推进状态（admin 专用）
   * - 不强制 force 时校验状态机合法性
   * - 推进后写 MiniProgramLog（action=manual_advance）
   * - 目标状态为 certified / online 时复用 MiniProgramService 的副作用：
   *     - certified 触发 pushService.sendCertifiedNotification
   *     - online   触发 pushService.sendOnlineNotification + 微信小程序码
   */
  async manualAdvance(
    userId: string,
    dto: ManualAdvanceStatusDto,
    actor: { id: string; nickname: string | null },
  ): Promise<MiniProgramUserDetailVo> {
    const mp = await this.miniProgramRepo.findOne({ where: { userId } });
    if (!mp) {
      throw new NotFoundException('该用户尚未解锁小程序申请资格');
    }

    const fromStatus = mp.status;
    const toStatus = dto.toStatus;

    if (fromStatus === toStatus) {
      throw new BadRequestException(
        `当前已为「${STATUS_LABELS[fromStatus]}」，无需推进`,
      );
    }

    if (!dto.force) {
      const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
      if (!allowed.includes(toStatus)) {
        const allowedText = allowed
          .map((s) => STATUS_LABELS[s])
          .join(' / ') || '（无）';
        throw new ConflictException(
          `「${STATUS_LABELS[fromStatus]}」只能推进到：${allowedText}。如需强制覆盖，请传 force=true`,
        );
      }
    }

    // 写入时间戳：自动维护对应阶段的"已发生"时间
    mp.status = toStatus;
    const now = new Date();
    switch (toStatus) {
      case 'certifying':
        if (!mp.qualificationUnlockedAt) mp.qualificationUnlockedAt = now;
        mp.certSubmittedAt = now;
        if (dto.certificationType) {
          mp.certificationType = dto.certificationType;
        }
        break;
      case 'certified':
        // certified 状态无对应"提交时间"字段（certSubmittedAt 已记录在上一阶段）
        break;
      case 'deploying':
        if (dto.certificationType && !mp.certificationType) {
          mp.certificationType = dto.certificationType;
        }
        mp.appidSubmittedAt = mp.appidSubmittedAt ?? now;
        break;
      case 'reviewing':
        mp.codeSubmittedAt = mp.codeSubmittedAt ?? now;
        break;
      case 'online':
        mp.onlineAt = now;
        break;
      case 'not_started':
        // admin 强制重置
        mp.certificationType = null;
        mp.appidSubmittedAt = null;
        mp.codeSubmittedAt = null;
        mp.onlineAt = null;
        // qualificationUnlockedAt 保留
        break;
    }

    await this.miniProgramRepo.save(mp);

    // 写操作日志
    await this.writeLog({
      actor,
      userId,
      userNickname: null,
      action: dto.force && !ALLOWED_TRANSITIONS[fromStatus].includes(toStatus) ? 'admin_reset' : 'manual_advance',
      fromStatus,
      toStatus,
      remark: dto.remark ?? null,
      extra: { force: !!dto.force, certificationType: dto.certificationType ?? null },
    });

    this.logger.log(
      `[admin] ${actor.id} 推进用户 ${userId} 状态 ${fromStatus} → ${toStatus}` +
        (dto.force ? ' (force)' : ''),
    );

    // 触发推送：certified / online 复用 PushService
    if (toStatus === 'certified') {
      void this.pushService.sendCertifiedNotification(userId).catch((e) =>
        this.logger.error(
          `推送失败 user=${userId} scene=certified err=${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    } else if (toStatus === 'online') {
      void this.pushService.sendOnlineNotification(userId).catch((e) =>
        this.logger.error(
          `推送失败 user=${userId} scene=online err=${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }

    return this.getUserDetail(userId);
  }

  // ======================== 发送提醒 ========================

  /**
   * 提醒 scene → 推送 scene 的映射
   * - admin 场景 'custom' 没有对应 PushScene，统一用 stale 作为兜底
   */
  private resolvePushScene(scene: ReminderScene): PushScene {
    switch (scene) {
      case 'mini_program_unlocked':
        return 'mini_program_unlocked';
      case 'mini_program_certified':
        return 'mini_program_certified';
      case 'mini_program_online':
        return 'mini_program_online';
      case 'mini_program_stale':
      case 'custom':
        return 'mini_program_stale';
    }
  }

  /**
   * 发送提醒（admin 触发）
   * - scene: 'mini_program_unlocked' / 'certified' / 'online' / 'stale' / 'custom'
   * - 'custom' 时使用 dto.title / dto.content
   * - 写日志（含推送结果 live/ok/reason）
   */
  async sendReminder(
    userId: string,
    dto: SendReminderDto,
    actor: { id: string; nickname: string | null },
  ): Promise<{ ok: true; delivered: boolean; reason?: string; live: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'phone', 'pushTokens', 'pushEnabled'],
    });
    if (!user) throw new NotFoundException('用户不存在');

    const title = dto.title ?? this.getDefaultTitle(dto.scene);
    const content = dto.content ?? this.getDefaultContent(dto.scene);
    const pushScene = this.resolvePushScene(dto.scene);

    const result = await this.pushService.sendToUser(userId, {
      scene: pushScene,
      title,
      content,
      pagePath: '/pages/invite/mini-program',
      extras: {
        source: `admin_reminder:${actor.id}`,
        scene: dto.scene,
        remark: dto.remark ?? '',
      },
    });

    await this.writeLog({
      actor,
      userId,
      userNickname: null,
      action: 'send_reminder',
      fromStatus: null,
      toStatus: null,
      remark: dto.remark ?? null,
      extra: {
        scene: dto.scene,
        pushScene,
        title,
        content,
        live: result.live,
        ok: result.ok,
        tokenCount: result.tokenCount,
        taskId: result.taskId ?? null,
        reason: result.reason ?? null,
      },
    });

    this.logger.log(
      `[admin] ${actor.id} 向用户 ${userId} 发送提醒 scene=${dto.scene} → pushScene=${pushScene} ` +
        `live=${result.live} ok=${result.ok} tokens=${result.tokenCount}` +
        (result.reason ? ` reason=${result.reason}` : ''),
    );

    return { ok: true, delivered: result.ok, reason: result.reason, live: result.live };
  }

  // ======================== 日志 ========================

  /**
   * 查询某个用户的操作日志
   */
  async listUserLogs(
    userId: string,
    query: ListUserLogsDto,
  ): Promise<PaginatedResult<MiniProgramLogVo>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.logRepo
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId });

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    qb.orderBy('log.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const list: MiniProgramLogVo[] = rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorName: r.actorName,
      userId: r.userId,
      userNickname: r.userNickname,
      action: r.action,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      remark: r.remark,
      extra: r.extra,
      createdAt: r.createdAt,
    }));

    return { list, total, page, pageSize };
  }

  // ======================== 内部 ========================

  private async writeLog(payload: {
    actor: { id: string; nickname: string | null };
    userId: string;
    userNickname: string | null;
    action: 'manual_advance' | 'send_reminder' | 'admin_reset' | 'admin_view_detail';
    fromStatus: MiniProgramStatus | null;
    toStatus: MiniProgramStatus | null;
    remark: string | null;
    extra?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const log = this.logRepo.create({
        actorId: payload.actor.id,
        actorName: payload.actor.nickname,
        userId: payload.userId,
        userNickname: payload.userNickname,
        action: payload.action,
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        remark: payload.remark,
        extra: payload.extra ?? null,
      });
      await this.logRepo.save(log);
    } catch (e) {
      this.logger.error(
        `写操作日志失败 err=${e instanceof Error ? e.message : String(e)}`,
      );
      // 日志失败不应阻塞主流程
    }
  }

  private getDefaultTitle(scene: ReminderScene): string {
    switch (scene) {
      case 'mini_program_unlocked':
        return '🎉 你解锁了个人专属小程序！';
      case 'mini_program_certified':
        return '✅ 你的小程序认证已通过';
      case 'mini_program_online':
        return '🎊 你的小程序已上线！';
      case 'mini_program_stale':
        return '⏳ 你的小程序申请还没完成';
      default:
        return 'GamDen 运营提醒';
    }
  }

  private getDefaultContent(scene: ReminderScene): string {
    switch (scene) {
      case 'mini_program_unlocked':
        return '邀请满3人，GamDen送你一个属于自己的小程序入口。点此查看 →';
      case 'mini_program_certified':
        return '微信审核已通过，快来完成最后一步部署吧！';
      case 'mini_program_online':
        return '恭喜！你的专属小程序现在可以被所有人看到了！';
      case 'mini_program_stale':
        return '还差最后一步，你的专属小程序就能上线了。点此继续 →';
      default:
        return 'GamDen 给你发送了一条运营消息。';
    }
  }
}

// ======================== 辅助函数 ========================

function toDateOrNull(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
