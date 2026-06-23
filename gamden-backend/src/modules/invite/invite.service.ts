import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import { Invite } from '../../entities/invite.entity';
import { User } from '../../entities/user.entity';
import { Territory } from '../../entities/territory.entity';

/**
 * 邀请码字符集（去掉易混字符 0/O/1/I/L）
 */
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** 邀请人每次成功邀请获得的 exp */
const INVITE_REWARD_EXP = 200;

/** 解锁个人专属小程序码所需邀请人数 */
const MINI_PROGRAM_UNLOCK_THRESHOLD = 3;

/** 领地等级经验表（与 territory.service.ts 保持一致） */
const LEVEL_EXP_TABLE: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 100,
  2: 300,
  3: 600,
  4: 1000,
};

/** 邀请统计返回结构 */
export interface InviteStats {
  /** 当前有效邀请码 */
  code: string;
  /** 总邀请成功人数 */
  totalInvited: number;
  /** 今日新增 */
  todayInvited: number;
  /** 本周新增 */
  weekInvited: number;
  /** 解锁阈值（默认 3） */
  unlockThreshold: number;
  /** 是否已解锁个人小程序码 */
  unlockedMiniProgram: boolean;
  /** 邀请码有效期 */
  expiresAt: Date | null;
}

/** 被邀请人列表项 */
export interface InviteeItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  guardianType: string | null;
  invitedAt: Date;
}

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(
    @InjectRepository(Invite) private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    private readonly config: ConfigService,
  ) {}

  /**
   * 生成新的邀请码
   * - 长度由配置决定，默认 8
   * - 字符集：去除易混的 0/O/1/I/L，仅大写字母 + 数字
   * - 冲突时最多重试 10 次
   */
  async generate(inviterId: string): Promise<Invite> {
    const length = this.config.get<number>('app.invite.codeLength', 8);

    for (let i = 0; i < 10; i++) {
      const code = Array.from({ length }, () =>
        CHARSET.charAt(Math.floor(Math.random() * CHARSET.length)),
      ).join('');

      const exists = await this.inviteRepo.findOne({ where: { code } });
      if (exists) continue;

      const invite = this.inviteRepo.create({
        code,
        inviterId,
        status: 'active',
        // 30 天有效期
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      });
      return this.inviteRepo.save(invite);
    }

    throw new ConflictException('邀请码生成失败，请重试');
  }

  /**
   * 查询我的邀请码 + 邀请进度
   * - 自动创建一个 active 邀请码（如果还没有）
   * - 返回当前邀请人数 / 目标 3 人
   */
  async getMyInvite(inviterId: string): Promise<{
    code: string;
    status: Invite['status'];
    invitedCount: number;
    inviteGoal: number;
    expiresAt: Date | null;
  }> {
    const active = await this.ensureActiveCode(inviterId);
    const user = await this.userRepo.findOne({ where: { id: inviterId } });
    return {
      code: active.code,
      status: active.status,
      invitedCount: user?.invitedCount ?? 0,
      inviteGoal: MINI_PROGRAM_UNLOCK_THRESHOLD,
      expiresAt: active.expiresAt,
    };
  }

  /**
   * 详细邀请统计（含今日/本周）
   */
  async getStats(inviterId: string): Promise<InviteStats> {
    const active = await this.ensureActiveCode(inviterId);
    const user = await this.userRepo.findOne({ where: { id: inviterId } });

    const totalInvited = user?.invitedCount ?? 0;

    // 今日 / 本周 邀请数（基于 invite.usedAt）
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayInvited = await this.inviteRepo.count({
      where: {
        inviterId,
        status: 'used',
        usedAt: MoreThan(startOfDay),
      },
    });

    const weekInvited = await this.inviteRepo.count({
      where: {
        inviterId,
        status: 'used',
        usedAt: MoreThan(startOfWeek),
      },
    });

    return {
      code: active.code,
      totalInvited,
      todayInvited,
      weekInvited,
      unlockThreshold: MINI_PROGRAM_UNLOCK_THRESHOLD,
      unlockedMiniProgram: totalInvited >= MINI_PROGRAM_UNLOCK_THRESHOLD,
      expiresAt: active.expiresAt,
    };
  }

  /**
   * 查询被邀请人列表（昵称/头像/守护灵/邀请时间）
   */
  async getInvitees(inviterId: string, limit = 50): Promise<InviteeItem[]> {
    const invites = await this.inviteRepo.find({
      where: { inviterId, status: 'used' },
      order: { usedAt: 'DESC' },
      take: limit,
    });

    if (invites.length === 0) return [];

    const inviteeIds = invites
      .map((i) => i.inviteeId)
      .filter((id): id is string => !!id);

    if (inviteeIds.length === 0) return [];

    const users = await this.userRepo.find({
      where: inviteeIds.map((id) => ({ id })),
      select: ['id', 'nickname', 'avatarUrl', 'guardianType', 'createdAt'],
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return invites
      .filter((i) => i.inviteeId && userMap.has(i.inviteeId))
      .map((i) => {
        const u = userMap.get(i.inviteeId!)!;
        return {
          id: u.id,
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
          guardianType: u.guardianType,
          invitedAt: i.usedAt ?? u.createdAt,
        };
      });
  }

  /**
   * 邀请人奖励（在 AuthService.register 事务中调用）
   * - 给邀请人 territory + 200 exp
   * - 触发可能的升级
   */
  async grantInviterReward(
    em: EntityManager,
    inviterId: string,
  ): Promise<{ expGained: number; levelUp: boolean; newLevel: number }> {
    const territory = await em.findOne(Territory, { where: { userId: inviterId } });
    if (!territory) {
      this.logger.warn(`Inviter ${inviterId} has no territory, skip reward`);
      return { expGained: 0, levelUp: false, newLevel: 1 };
    }

    const beforeLevel = territory.level;
    territory.exp += INVITE_REWARD_EXP;

    let levelUp = false;
    while (territory.level < 5) {
      const required = LEVEL_EXP_TABLE[territory.level as 1 | 2 | 3 | 4];
      if (territory.exp < required) break;
      territory.exp -= required;
      territory.level = (territory.level + 1) as Territory['level'];
      levelUp = true;
    }

    await em.save(territory);

    if (levelUp) {
      this.logger.log(
        `Inviter ${inviterId} 邀请奖励触发升级: Lv.${beforeLevel} → Lv.${territory.level}`,
      );
    }

    return {
      expGained: INVITE_REWARD_EXP,
      levelUp,
      newLevel: territory.level,
    };
  }

  /**
   * 邀请海报数据（前端 Canvas 绘制用）
   * - 后端只返回元数据（昵称、邀请码、扫码链接）
   * - 海报渲染由前端 Canvas 完成
   */
  async getPosterData(inviterId: string): Promise<{
    nickname: string;
    guardianType: string | null;
    inviteCode: string;
    inviteUrl: string;
    totalInvited: number;
    qrCodeDataUrl: string;
  }> {
    const user = await this.userRepo.findOne({ where: { id: inviterId } });
    if (!user) throw new NotFoundException('用户不存在');
    const active = await this.ensureActiveCode(inviterId);

    // 邀请落地链接（App 用户从 H5 唤起 / 小程序用户从微信打开）
    const baseUrl = this.config.get<string>('app.inviteBaseUrl', 'https://gamden.matux.tech');
    const inviteUrl = `${baseUrl}/pages/auth/login?inviteCode=${active.code}`;

    // V1.0 模拟二维码（前端绘制 + 后端预留）
    // TODO: 真实环境可接入微信小程序码 / 第三方 QR API
    const qrCodeDataUrl = await this.generateQrCodeDataUrl(active.code, inviteUrl);

    return {
      nickname: user.nickname,
      guardianType: user.guardianType ?? null,
      inviteCode: active.code,
      inviteUrl,
      totalInvited: user.invitedCount,
      qrCodeDataUrl,
    };
  }

  /**
   * 个人小程序码（≥3 人解锁）
   * - 返回 base64 图片数据 + scene 参数
   * - V1.0 mock：返回 SVG 占位图；V1.1 接微信 getwxacodeunlimit
   */
  async getMiniProgramCode(inviterId: string): Promise<{
    unlocked: boolean;
    invitedCount: number;
    threshold: number;
    /** 解锁后才有 */
    imageBase64?: string;
    /** 小程序码 scene 参数 */
    scene?: string;
    /** 落地页路径 */
    pagePath?: string;
    /** 过期时间 */
    expiresAt?: Date;
  }> {
    const user = await this.userRepo.findOne({ where: { id: inviterId } });
    if (!user) throw new NotFoundException('用户不存在');

    const invitedCount = user.invitedCount ?? 0;
    const unlocked = invitedCount >= MINI_PROGRAM_UNLOCK_THRESHOLD;

    if (!unlocked) {
      return {
        unlocked: false,
        invitedCount,
        threshold: MINI_PROGRAM_UNLOCK_THRESHOLD,
      };
    }

    // V1.0 mock：生成 SVG 占位图（前端 Canvas 也可以直接画）
    const scene = `inviter=${inviterId}&u=${user.nickname.slice(0, 8)}`;
    const svgQr = this.generateMockMiniProgramCodeSvg(scene);

    return {
      unlocked: true,
      invitedCount,
      threshold: MINI_PROGRAM_UNLOCK_THRESHOLD,
      imageBase64: `data:image/svg+xml;base64,${Buffer.from(svgQr).toString('base64')}`,
      scene,
      pagePath: 'pages/land/land',
      // 30 天有效期（小程序码可重新生成）
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    };
  }

  // ============== 私有方法 ==============

  /**
   * 确保用户至少有一个 active 邀请码
   */
  private async ensureActiveCode(inviterId: string): Promise<Invite> {
    let active = await this.inviteRepo.findOne({
      where: { inviterId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    if (!active) {
      active = await this.generate(inviterId);
    }
    return active;
  }

  /**
   * 模拟生成二维码 dataURL
   * V1.0 mock：返回简单 SVG 占位（真实环境用 qrcode 库或微信 API）
   */
  private async generateQrCodeDataUrl(
    code: string,
    url: string,
  ): Promise<string> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" fill="#F5F0E6"/>
      <rect x="10" y="10" width="220" height="220" fill="#1E241F"/>
      <text x="120" y="110" text-anchor="middle" fill="#C9A87C" font-family="monospace" font-size="22" font-weight="bold">${code}</text>
      <text x="120" y="140" text-anchor="middle" fill="#A89E85" font-family="sans-serif" font-size="12">扫码入驻巢穴</text>
      <text x="120" y="160" text-anchor="middle" fill="#A89E85" font-family="sans-serif" font-size="10">${url.slice(0, 32)}...</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * V1.0 模拟小程序码 SVG
   * 真实实现：
   *   POST https://api.weixin.qq.com/wxa/getwxacodeunlimit
   *   { scene, page, width: 430, ... }
   */
  private generateMockMiniProgramCodeSvg(scene: string): string {
    const cells: string[] = [];
    // 简单的 21x21 QR 风格网格（用 scene 哈希做种子）
    const seed = Array.from(scene).reduce((s, c) => s + c.charCodeAt(0), 0);
    let rng = seed;
    const next = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        const isFinder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        const isBorder = (x === 6 || y === 6 || x === 14 || y === 14);
        const isBlack = isFinder ? isBorder : next() > 0.5;
        if (isBlack) cells.push(`<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="#1E241F"/>`);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="210" viewBox="0 0 210 210">
      <rect width="210" height="210" fill="#FFFFFF"/>
      ${cells.join('')}
      <rect x="0" y="0" width="70" height="70" fill="none" stroke="#1E241F" stroke-width="6"/>
      <rect x="20" y="20" width="30" height="30" fill="#1E241F"/>
      <rect x="140" y="0" width="70" height="70" fill="none" stroke="#1E241F" stroke-width="6"/>
      <rect x="160" y="20" width="30" height="30" fill="#1E241F"/>
      <rect x="0" y="140" width="70" height="70" fill="none" stroke="#1E241F" stroke-width="6"/>
      <rect x="20" y="160" width="30" height="30" fill="#1E241F"/>
      <rect x="80" y="100" width="50" height="50" fill="#C9A87C"/>
      <text x="105" y="125" text-anchor="middle" fill="#1E241F" font-size="10" font-weight="bold">GD</text>
    </svg>`;
  }
}
