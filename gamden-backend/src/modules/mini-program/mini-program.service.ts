import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserMiniProgram } from '../../entities/user-mini-program.entity';
import {
  CertificationType,
  MiniProgramStatus,
} from '../../entities/user-mini-program.entity';
import { User } from '../../entities/user.entity';
import { Tutorial } from '../../entities/tutorial.entity';
import { WechatService } from './wechat.service';
import { PushService } from '../push/push.service';
import { TrackingService } from '../tracking/tracking.service';

/** 解锁自主小程序所需邀请人数（与 InviteService 保持一致） */
const MINI_PROGRAM_UNLOCK_THRESHOLD = 3;

/** 微信小程序 AppID 正则：wx + 16位十六进制 */
const APPID_REGEX = /^wx[0-9a-f]{16}$/i;

/**
 * AppID 脱敏：保留前 4 后 4，中间替换为 ****
 * 例：wx1234567890abcdef → wx12****cdef
 */
function maskAppid(appid: string): string {
  if (appid.length <= 8) return '****';
  return `${appid.slice(0, 4)}****${appid.slice(-4)}`;
}

/**
 * 教程条目
 */
export interface TutorialItem {
  id: string;
  title: string;
  type: 'article' | 'video';
  url: string;
  /** 简要说明 */
  summary: string;
}

/**
 * 状态流转合法性校验表
 * key = 当前状态，value = 允许流转到的下一状态集合
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
 * 用户自主小程序申请与部署 —— 状态机 Service
 *
 * 生命周期（单向流转）：
 *   not_started → certifying → certified → deploying → reviewing → online
 *
 * 说明：
 *   - not_started → certifying：用户调用 POST /apply（选择主体类型，确认已提交认证）
 *   - certifying → certified：外部微信回调 / 管理后台触发（本期未实现独立接口，由上层调用 service 内部方法）
 *   - certified → deploying：用户调用 POST /appid（提交 AppID）
 *   - deploying → reviewing：POST /confirm-reviewing（系统自动 / 用户确认）
 *   - reviewing → online：POST /confirm-online（系统自动 / 用户确认，同时生成小程序码）
 *   - 任意非 online 状态 → not_started：POST /abandon（放弃重置）
 */
@Injectable()
export class MiniProgramService {
  private readonly logger = new Logger(MiniProgramService.name);

  constructor(
    @InjectRepository(UserMiniProgram)
    private readonly miniProgramRepo: Repository<UserMiniProgram>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tutorial)
    private readonly tutorialRepo: Repository<Tutorial>,
    private readonly wechatService: WechatService,
    private readonly pushService: PushService,
    private readonly trackingService: TrackingService,
  ) {}

  // ======================== 查询 ========================

  /**
   * 获取当前用户的申请状态
   * - 如果用户未解锁资格（邀请人数 < 阈值），返回 null
   * - 如果已解锁但无记录，自动创建 not_started 记录
   */
  async getStatus(userId: string): Promise<UserMiniProgram | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 未达邀请阈值 → 未解锁
    if ((user.invitedCount ?? 0) < MINI_PROGRAM_UNLOCK_THRESHOLD) {
      return null;
    }

    // 已解锁，确保记录存在
    return this.ensureRecord(userId);
  }

  // ======================== 状态流转 ========================

  /**
   * POST /apply —— 用户开始申请
   * not_started → certifying
   * - 记录 certificationType
   * - 记录 certSubmittedAt
   */
  async apply(
    userId: string,
    certificationType: CertificationType,
  ): Promise<UserMiniProgram> {
    const record = await this.ensureRecord(userId);
    this.assertTransition(record.status, 'certifying');

    record.status = 'certifying';
    record.certificationType = certificationType;
    record.certSubmittedAt = new Date();

    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(
      `用户 ${userId} 提交小程序认证申请，主体类型: ${certificationType}`,
    );

    // 埋点：mp_apply_start（用户开始申请，带 certification_type）
    void this.trackingService.trackServer('mp_apply_start', {
      userId,
      properties: { certification_type: certificationType },
    });

    return saved;
  }

  /**
   * POST /appid —— 用户提交 AppID
   * certified → deploying
   * - 校验 AppID 格式（wx + 16位十六进制）
   * - 通过微信开放平台 API 实时校验 AppID + AppSecret 是否有效
   * - 记录 appidSubmittedAt
   * - AppSecret 加密存储在数据库（不在响应中回传）
   */
  async submitAppid(
    userId: string,
    appid: string,
    appSecret: string,
  ): Promise<UserMiniProgram> {
    if (!APPID_REGEX.test(appid)) {
      throw new BadRequestException(
        'AppID 格式不正确，应为 wx 开头的 18 位字符串（如 wx1234567890abcdef）',
      );
    }

    if (!appSecret || appSecret.length < 16) {
      throw new BadRequestException('AppSecret 格式不正确，至少 16 位');
    }

    // 微信 API 实时校验 AppID + AppSecret
    const validation = await this.wechatService.validateAppId(appid, appSecret);
    if (!validation.valid) {
      throw new BadRequestException(
        `AppID 校验失败：${validation.errorMessage ?? '无效的 AppID 或 AppSecret'}（errcode=${validation.errorCode ?? '?'}）`,
      );
    }

    const record = await this.getRecordOrThrow(userId);
    this.assertTransition(record.status, 'deploying');

    record.status = 'deploying';
    record.appid = appid;
    record.appSecret = appSecret;
    record.appidSubmittedAt = new Date();

    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(`用户 ${userId} 提交小程序 AppID: ${appid}（校验通过）`);

    // 埋点：mp_appid_submitted（AppID 脱敏）
    void this.trackingService.trackServer('mp_appid_submitted', {
      userId,
      properties: { appid: maskAppid(appid) },
    });

    return saved;
  }

  /**
   * POST /confirm-reviewing —— 确认代码审核中
   * deploying → reviewing
   * - 记录 codeSubmittedAt
   */
  async confirmReviewing(userId: string): Promise<UserMiniProgram> {
    const record = await this.getRecordOrThrow(userId);
    this.assertTransition(record.status, 'reviewing');

    record.status = 'reviewing';
    record.codeSubmittedAt = new Date();

    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(`用户 ${userId} 小程序代码已提交审核`);

    // 埋点：mp_code_submitted
    void this.trackingService.trackServer('mp_code_submitted', {
      userId,
    });

    return saved;
  }

  /**
   * certifying → certified —— 微信认证通过
   * - V1.0 mock：暂未接入微信回调，由管理后台 / 运营 cron 手动调用
   * - V1.1 接入微信开放平台 API 后由 webhook 触发
   * - 状态推进后触发推送：✅ 你的小程序认证已通过
   */
  async markAsCertified(userId: string): Promise<UserMiniProgram> {
    const record = await this.getRecordOrThrow(userId);
    this.assertTransition(record.status, 'certified');

    record.status = 'certified';
    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(`用户 ${userId} 小程序已通过微信认证`);

    // 触发推送（fire-and-forget，不阻塞主流程）
    void this.pushService.sendCertifiedNotification(userId).catch((e) => {
      this.logger.error(
        `推送失败 user=${userId} scene=certified err=${e instanceof Error ? e.message : String(e)}`,
      );
    });

    return saved;
  }

  /**
   * POST /confirm-online —— 确认已上线
   * reviewing → online
   * - 记录 onlineAt
   * - 调用微信 getwxacodeunlimit 生成小程序码
   * - V1.0 mock 模式：返回 SVG data URL
   * - 状态推进后触发推送：🎊 你的小程序已上线！
   */
  async confirmOnline(userId: string): Promise<UserMiniProgram> {
    const record = await this.getRecordOrThrow(userId);
    this.assertTransition(record.status, 'online');

    if (!record.appid || !record.appSecret) {
      throw new BadRequestException('缺少 AppID/AppSecret，请先提交 AppID');
    }

    // 调用微信 API 生成小程序码（用 userId 作为 scene 参数）
    const qrCode = await this.wechatService.generateMiniProgramCode(
      record.appid,
      record.appSecret,
      `mp=${userId}`,
    );

    record.status = 'online';
    record.onlineAt = new Date();
    record.qrCodeUrl = qrCode.dataUrl;

    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(`用户 ${userId} 小程序已上线 🎉（小程序码已生成）`);

    // 触发推送：🎊 你的小程序已上线！
    void this.pushService.sendOnlineNotification(userId).catch((e) => {
      this.logger.error(
        `推送失败 user=${userId} scene=online err=${e instanceof Error ? e.message : String(e)}`,
      );
    });

    // 埋点：mp_online（带 online_at 时间戳）
    void this.trackingService.trackServer('mp_online', {
      userId,
      properties: {
        online_at: saved.onlineAt?.toISOString() ?? new Date().toISOString(),
      },
    });

    return saved;
  }

  /**
   * POST /abandon —— 用户放弃申请
   * 任意非 online 状态 → not_started（重置）
   * - 清空 certificationType / appid / 各阶段时间戳 / qrCodeUrl
   * - 保留 qualificationUnlockedAt（资格不因放弃而丢失）
   */
  async abandon(userId: string): Promise<UserMiniProgram> {
    const record = await this.getRecordOrThrow(userId);

    if (record.status === 'online') {
      throw new ConflictException('小程序已上线，无法放弃申请');
    }

    const previousStatus = record.status;
    const previousAppid = record.appid;

    record.status = 'not_started';
    record.certificationType = null;
    record.appid = null;
    record.appSecret = null;
    record.certSubmittedAt = null;
    record.appidSubmittedAt = null;
    record.codeSubmittedAt = null;
    record.onlineAt = null;
    record.qrCodeUrl = null;
    // qualificationUnlockedAt 保留

    // 清除该 AppID 的 access_token 缓存（可能与新申请不同）
    if (previousAppid) {
      await this.wechatService.clearAccessTokenCache(previousAppid);
    }

    const saved = await this.miniProgramRepo.save(record);
    this.logger.log(`用户 ${userId} 放弃小程序申请，状态已重置`);

    // 埋点：mp_abandon（带 current_status —— 放弃前的状态）
    void this.trackingService.trackServer('mp_abandon', {
      userId,
      properties: { current_status: previousStatus },
    });

    return saved;
  }

  // ======================== 教程 ========================

  /**
   * GET /tutorials —— 获取教程列表
   * - V1.0：优先从 tutorials 表读取（后台增删改），无数据时回退到静态种子
   * - isActive=true 才返回，按 stage/sortOrder 排序
   */
  async getTutorials(): Promise<TutorialItem[]> {
    const dbList = await this.tutorialRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (dbList.length > 0) {
      return dbList.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        url: t.url,
        summary: t.summary,
      }));
    }

    // 静态种子 fallback（无 DB 数据时使用）
    return this.getStaticTutorials();
  }

  /**
   * 静态种子教程（V1.0 兜底；运营通过后台增删改后即被 DB 数据取代）
   */
  private getStaticTutorials(): TutorialItem[] {
    return [
      {
        id: 'tut-1',
        title: '如何注册微信小程序账号',
        type: 'article',
        url: 'https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html',
        summary: '指引您前往微信公众平台注册小程序账号，选择个人或企业主体类型。',
      },
      {
        id: 'tut-2',
        title: '微信小程序认证流程详解',
        type: 'article',
        url: 'https://kf.qq.com/faq/1612247f6IzQ161224VfeAfe.html',
        summary: '完成微信认证的详细步骤，包括材料准备、提交审核、缴费等环节。',
      },
      {
        id: 'tut-3',
        title: '获取小程序 AppID 的方法',
        type: 'video',
        url: 'https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/',
        summary: '登录微信公众平台 → 开发 → 开发管理 → 开发设置，即可查看 AppID。',
      },
      {
        id: 'tut-4',
        title: '小程序代码审核与发布指南',
        type: 'article',
        url: 'https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html',
        summary: '了解代码提交审核流程、审核标准及发布上线操作。',
      },
    ];
  }

  // ======================== 内部辅助方法 ========================

  /**
   * 确保已解锁用户拥有申请记录（幂等创建）
   * - 查找用户是否已有记录，无则创建 not_started
   * - 同时写入 qualificationUnlockedAt
   */
  private async ensureRecord(userId: string): Promise<UserMiniProgram> {
    let record = await this.miniProgramRepo.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.miniProgramRepo.create({
        userId,
        status: 'not_started',
        certificationType: null,
        appid: null,
        customName: null,
        qualificationUnlockedAt: new Date(),
        certSubmittedAt: null,
        appidSubmittedAt: null,
        codeSubmittedAt: null,
        onlineAt: null,
        qrCodeUrl: null,
      });
      record = await this.miniProgramRepo.save(record);
      this.logger.log(`用户 ${userId} 首次访问，已创建小程序申请记录`);
    }

    return record;
  }

  /**
   * 获取用户记录，不存在则抛出 404
   */
  private async getRecordOrThrow(userId: string): Promise<UserMiniProgram> {
    const record = await this.miniProgramRepo.findOne({ where: { userId } });
    if (!record) {
      throw new NotFoundException(
        '尚未获得自主小程序部署资格，请先完成邀请任务',
      );
    }
    return record;
  }

  /**
   * 校验状态流转是否合法
   * @throws ConflictException 当前状态不允许流转到目标状态
   */
  private assertTransition(
    current: MiniProgramStatus,
    target: MiniProgramStatus,
  ): void {
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(target)) {
      const statusLabels: Record<MiniProgramStatus, string> = {
        not_started: '未开始',
        certifying: '认证中',
        certified: '认证通过',
        deploying: '待部署',
        reviewing: '代码审核中',
        online: '已上线',
      };
      throw new ConflictException(
        `当前状态为「${statusLabels[current]}」，无法执行此操作。` +
          `请先完成当前阶段后再继续。`,
      );
    }
  }
}