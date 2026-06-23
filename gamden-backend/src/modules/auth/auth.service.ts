import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { User } from '../../entities/user.entity';
import { Territory } from '../../entities/territory.entity';
import { Invite } from '../../entities/invite.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { SmsService } from '../sms/sms.service';
import { SmsPurpose } from '../sms/dto/send-sms.dto';
import { InviteService } from '../invite/invite.service';
import { ImService } from '../im/im.service';
import { PushService } from '../push/push.service';
import { TrackingService } from '../tracking/tracking.service';

/** 解锁个人小程序所需邀请人数（与 InviteService 保持一致） */
const MINI_PROGRAM_UNLOCK_THRESHOLD = 3;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(Invite) private readonly inviteRepo: Repository<Invite>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly inviteService: InviteService,
    private readonly imService: ImService,
    private readonly pushService: PushService,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * 注册：
   *  1. 验证手机号验证码（purpose=register）
   *  2. 验证邀请码（INVITE_REQUIRED=true 时必填）
   *  3. 创建用户 + 分配随机领地坐标 + 标记邀请码已使用
   *  全部用事务保证一致性
   */
  async register(dto: RegisterDto): Promise<{ user: User; tokens: TokenPairDto }> {
    // 1. 校验短信验证码（必须先通过，否则不会创建用户）
    const smsOk = await this.sms.verifyCode(dto.phone, dto.smsCode, SmsPurpose.REGISTER);
    if (!smsOk) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 1.5 事务前预查询邀请码，拿到 inviterId 用于事务后推送检查
    const preInvite = await this.inviteRepo.findOne({ where: { code: dto.inviteCode } });
    if (!preInvite) throw new ConflictException('邀请码不存在');
    if (preInvite.status !== 'active') {
      throw new ConflictException(`邀请码已 ${preInvite.status === 'used' ? '使用' : '作废'}`);
    }
    if (preInvite.expiresAt && preInvite.expiresAt < new Date()) {
      throw new ConflictException('邀请码已过期');
    }
    const inviterId = preInvite.inviterId;

    return this.dataSource.transaction(async (em: EntityManager) => {
      // 2. 手机号唯一性
      const exists = await em.findOne(User, { where: { phone: dto.phone } });
      if (exists) throw new ConflictException('该手机号已注册');

      // 3. 复用预查询的 invite 实体（避免重复查询）
      const invite = preInvite;
      if (!invite) throw new ConflictException('邀请码不存在');

      // 4. 创建用户
      const user = em.create(User, {
        nickname: dto.nickname,
        phone: dto.phone,
        guardianType: dto.guardianType,
        role: 'registered',
        isActive: true,
      });
      await em.save(user);

      // 5. 分配领地坐标（邀请人相邻 8 格优先，全局随机兜底）
      const territory = await this.assignTerritory(em, user.id, invite.inviterId);
      this.logger.log(
        `User ${user.id} registered with territory (${territory.coordX}, ${territory.coordY})`,
      );

      // 6. 标记邀请码已使用 + 更新邀请人计数 + 邀请人获得 exp 奖励
      invite.inviteeId = user.id;
      invite.status = 'used';
      invite.usedAt = new Date();
      await em.save(invite);
      await em.increment(User, { id: invite.inviterId }, 'invitedCount', 1);

      // 邀请人获得 +200 exp，可能触发领地升级
      await this.inviteService.grantInviterReward(em, invite.inviterId);

      // 7. IM 账号创建 + 签发 IM token
      await this.imService.createUser(user);
      const imToken = await this.imService.getToken(user);

      const tokens = await this.issueTokens({ sub: user.id, role: user.role });
      return {
        user,
        tokens: {
          ...tokens,
          imUserId: imToken.imUserId,
          imToken: imToken.token,
          imExpiresIn: imToken.expiresIn,
          imExpireTime: imToken.expireTime,
        },
      };
    }).then(async (result) => {
      // 事务提交后检查邀请人是否刚刚达到解锁阈值（≥3）
      // - 推送 fire-and-forget，不阻塞 register 响应
      // - 推送服务内部用 Redis 防重避免并发注册时重复推送
      try {
        if (!inviterId) return result;
        const inviter = await this.userRepo.findOne({
          where: { id: inviterId },
          select: ['id', 'invitedCount'],
        });
        if (
          inviter &&
          inviter.invitedCount !== null &&
          inviter.invitedCount !== undefined &&
          inviter.invitedCount >= MINI_PROGRAM_UNLOCK_THRESHOLD
        ) {
          // 推送通知：🎉 你解锁了个人专属小程序！
          void this.pushService.sendUnlockedNotification(inviterId).catch((e) => {
            this.logger.error(
              `邀请达标推送失败 user=${inviterId} err=${e instanceof Error ? e.message : String(e)}`,
            );
          });
          // 埋点：mp_qualification_unlocked（带 invite_count）
          void this.trackingService.trackServer('mp_qualification_unlocked', {
            userId: inviterId,
            properties: { invite_count: inviter.invitedCount },
          });
        }
      } catch (e) {
        // 推送失败不影响 register 主流程
        this.logger.error(
          `检查邀请人解锁状态异常 err=${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return result;
    });
  }

  /**
   * 登录：手机号 + 短信验证码（V1.0 唯一认证方式）
   * - 用户必须先注册（否则 404）
   * - 验证码用完即失效（getDel）
   */
  async login(dto: LoginDto): Promise<{ user: User; tokens: TokenPairDto }> {
    const smsOk = await this.sms.verifyCode(dto.phone, dto.smsCode, SmsPurpose.LOGIN);
    if (!smsOk) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('该手机号未注册');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('账号已停用');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // IM token 签发（用户已存在 IM 账号）
    const imToken = await this.imService.getToken(user);
    const tokens = await this.issueTokens({ sub: user.id, role: user.role });
    return {
      user,
      tokens: {
        ...tokens,
        imUserId: imToken.imUserId,
        imToken: imToken.token,
        imExpiresIn: imToken.expiresIn,
        imExpireTime: imToken.expireTime,
      },
    };
  }

  /**
   * 刷新 token：验证 refresh token，签发新的 access token
   */
  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const refreshSecret = this.config.get<string>('jwt.refresh.secret');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET 未配置');

    let payload: JwtUserPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtUserPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('账号不存在或已停用');

    return this.issueTokens({ sub: user.id, role: user.role });
  }

  // ----- 私有方法 -----

  private async issueTokens(payload: JwtUserPayload): Promise<TokenPairDto> {
    const accessTtl = this.config.get<string>('jwt.access.ttl', '2h');
    const refreshTtl = this.config.get<string>('jwt.refresh.ttl', '14d');
    const accessSecret = this.config.get<string>('jwt.access.secret');
    const refreshSecret = this.config.get<string>('jwt.refresh.secret');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: accessSecret, expiresIn: accessTtl }),
      this.jwt.signAsync(payload, { secret: refreshSecret, expiresIn: refreshTtl }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseTtl(accessTtl),
    };
  }

  /**
   * 分配唯一领地坐标
   * - 如果传 inviterId，先尝试分配在邀请人相邻 8 格（±1 邻域）
   * - 8 格都满或邀请人无领地，回退到全局随机（-1000~1000）
   * - 最多重试 30 次以避免冲突
   */
  private async assignTerritory(
    em: EntityManager,
    userId: string,
    inviterId?: string,
  ): Promise<Territory> {
    const min = this.config.get<number>('app.territory.coordMin', -1000);
    const max = this.config.get<number>('app.territory.coordMax', 1000);

    // 1. 邀请人相邻 8 格
    if (inviterId) {
      const inviterTerritory = await em.findOne(Territory, {
        where: { userId: inviterId },
      });
      if (inviterTerritory) {
        const neighbor = await this.pickNeighborCoord(
          em,
          inviterTerritory.coordX,
          inviterTerritory.coordY,
          min,
          max,
        );
        if (neighbor) {
          const t = em.create(Territory, {
            userId,
            coordX: neighbor.x,
            coordY: neighbor.y,
            level: 1,
            exp: 0,
            nextLevelExp: 100,
          });
          await em.save(t);
          this.logger.log(
            `User ${userId} 分配到邀请人 ${inviterId} 相邻格 (${neighbor.x}, ${neighbor.y})`,
          );
          return t;
        }
        this.logger.warn(
          `邀请人 ${inviterId} 周围 8 格已满，回退到全局随机分配`,
        );
      }
    }

    // 2. 全局随机分配
    const range = max - min + 1;
    const MAX_RETRY = 30;
    let coordX = 0;
    let coordY = 0;

    for (let i = 0; i < MAX_RETRY; i++) {
      coordX = min + Math.floor(Math.random() * range);
      coordY = min + Math.floor(Math.random() * range);

      const existing = await em.findOne(Territory, {
        where: { coordX, coordY },
      });
      if (!existing) break;

      if (i === MAX_RETRY - 1) {
        throw new ConflictException('领地坐标分配失败，请稍后重试');
      }
    }

    const territory = em.create(Territory, {
      userId,
      coordX,
      coordY,
      level: 1,
      exp: 0,
      nextLevelExp: 100,
    });
    await em.save(territory);
    return territory;
  }

  /**
   * 在邀请人 (cx, cy) 周围 8 格找一个未被占用的坐标
   */
  private async pickNeighborCoord(
    em: EntityManager,
    cx: number,
    cy: number,
    min: number,
    max: number,
  ): Promise<{ x: number; y: number } | null> {
    const offsets: Array<[number, number]> = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1],
    ];

    // Fisher-Yates 洗牌
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    for (const [dx, dy] of offsets) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < min || x > max || y < min || y > max) continue;
      const exists = await em.findOne(Territory, {
        where: { coordX: x, coordY: y },
      });
      if (!exists) return { x, y };
    }
    return null;
  }

  private parseTtl(ttl: string): number {
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return 7200;
    const value = parseInt(m[1]!, 10);
    const unit = m[2];
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (map[unit!] ?? 3600);
  }
}
