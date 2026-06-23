import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.module';
import { TerritoryService } from '../../modules/territory/territory.service';
import { ClubService } from '../../modules/club/club.service';
import { User } from '../../entities/user.entity';
import { Club } from '../../entities/club.entity';
import {
  GroupCreateEvent,
  MessageSendEvent,
  OpenIMWebhookEnvelope,
  OpenIMWebhookCommand,
  UserRegisterEvent,
  WebhookHandlerResult,
} from './openim-webhook.types';

/**
 * OpenIM Webhook 事件分发服务
 *
 * 职责：
 *  1. 根据 envelope.command 分发到对应 handler
 *  2. 通过 Redis SETNX 实现幂等去重（基于 eventId，TTL 24h）
 *  3. 关键词检测（在 message.send 中识别 "野兽"/"组队" 等关键词）
 *  4. 返回标准化 WebhookHandlerResult
 *
 * 业务流程：
 *  - user.register  → TerritoryService.assignTerritoryForUser()（创建领地）
 *  - group.create   → ClubService.create()（创建俱乐部）
 *  - message.send   → 关键词检测（V2.0 触发领地防御/组队邀请等，预留接口）
 */
@Injectable()
export class OpenIMWebhookService {
  private readonly logger = new Logger(OpenIMWebhookService.name);

  /** 幂等去重 key 前缀 */
  private static readonly IDEMPOTENCY_PREFIX = 'openim:webhook:event:';
  /** 幂等记录 TTL（24 小时） */
  private static readonly IDEMPOTENCY_TTL_SEC = 24 * 3600;

  /** 关键词触发规则（V2.0 预留） */
  private static readonly KEYWORD_RULES: Array<{
    keyword: RegExp;
    scene: 'beast' | 'team' | 'help';
    label: string;
  }> = [
    { keyword: /野兽|野怪|怪物/, scene: 'beast', label: '领地防御事件（V2.0）' },
    { keyword: /组队|开黑|一起玩/, scene: 'team', label: '组队邀请（V2.0）' },
    { keyword: /求助|帮忙|help/i, scene: 'help', label: '求助信号（V2.0）' },
  ];

  constructor(
    private readonly redis: RedisService,
    private readonly territoryService: TerritoryService,
    private readonly clubService: ClubService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 统一事件入口
   * - Controller 调用此方法，传入 envelope
   * - 返回处理结果（Controller 再转换为 OpenIM ack）
   */
  async handle(envelope: OpenIMWebhookEnvelope): Promise<WebhookHandlerResult> {
    const start = Date.now();
    const eventId = envelope.eventId ?? `${envelope.command}:${Date.now()}`;

    // 1. 幂等去重
    const dedupKey = `${OpenIMWebhookService.IDEMPOTENCY_PREFIX}${eventId}`;
    const isFirst = await this.markProcessedIfFirst(dedupKey);
    if (!isFirst) {
      this.logger.log(`[Webhook] duplicate event ${eventId}, skip`);
      return {
        success: true,
        message: 'duplicate event ignored',
        durationMs: Date.now() - start,
      };
    }

    // 2. 分发
    try {
      let result: WebhookHandlerResult;
      switch (envelope.command) {
        case 'user.register':
          result = await this.handleUserRegister(envelope.data as UserRegisterEvent);
          break;
        case 'group.create':
          result = await this.handleGroupCreate(envelope.data as GroupCreateEvent);
          break;
        case 'message.send':
          result = await this.handleMessageSend(envelope.data as MessageSendEvent);
          break;
        default:
          // 未实现的事件：返回成功（不重试），但记录日志
          this.logger.warn(
            `[Webhook] unhandled command: ${envelope.command as string}`,
          );
          result = {
            success: true,
            message: `unhandled command: ${envelope.command}`,
          };
      }
      result.durationMs = Date.now() - start;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Webhook] handler error (event=${eventId}): ${msg}`);
      // 失败：清除幂等标记，允许 OpenIM 重试
      await this.redis.del(dedupKey);
      return {
        success: false,
        message: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  /* ============================================================
   * Handler: user.register
   * ============================================================ */

  /**
   * 处理用户注册事件
   * - 兜底：如果业务侧的 register 接口已创建领地，这里会跳过（assignTerritoryForUser 内部有重复检测）
   * - 兜底：保证通过 OpenIM 直接注册的账号也能获得领地
   */
  private async handleUserRegister(event: UserRegisterEvent): Promise<WebhookHandlerResult> {
    if (!event.userID) {
      throw new Error('user.register: missing userID');
    }

    // 检查用户是否存在（业务库）
    const user = await this.userRepo.findOne({ where: { id: event.userID } });
    if (!user) {
      this.logger.warn(
        `[user.register] OpenIM 上报 ${event.userID}，但业务库无此用户（可能业务注册晚于 OpenIM）`,
      );
      // 不抛错：等业务注册流程完成后，调用 /im/sync-user 即可补齐
      return {
        success: true,
        message: 'user not in business db, waiting for business register',
      };
    }

    // 检查是否已有领地
    const existingTerritory = await this.dataSource
      .getRepository('territories')
      .findOne({ where: { userId: event.userID } });
    if (existingTerritory) {
      this.logger.log(
        `[user.register] ${event.userID} 已有领地 ${(existingTerritory as { id: string }).id}，跳过`,
      );
      return {
        success: true,
        message: 'territory already exists',
        sideEffects: { territoryId: (existingTerritory as { id: string }).id },
      };
    }

    // 创建领地（用事务 + 全局随机坐标）
    const territory = await this.dataSource.transaction(async (em) => {
      return this.territoryService.assignTerritoryForUser(em, event.userID);
    });

    this.logger.log(
      `[user.register] 为 ${event.userID} 创建领地 ${territory.id} at (${territory.coordX},${territory.coordY})`,
    );

    return {
      success: true,
      message: 'territory created',
      sideEffects: {
        territoryId: territory.id,
        coordX: territory.coordX,
        coordY: territory.coordY,
      },
    };
  }

  /* ============================================================
   * Handler: group.create
   * ============================================================ */

  /**
   * 处理群组创建事件
   * - 同步创建本地俱乐部（与群组 1:1 绑定）
   * - 使用群组的 ownerUserID 作为俱乐部 owner
   */
  private async handleGroupCreate(event: GroupCreateEvent): Promise<WebhookHandlerResult> {
    if (!event.groupID || !event.ownerUserID) {
      throw new Error('group.create: missing groupID or ownerUserID');
    }

    // 幂等：检查是否已为该 groupID 创建过俱乐部
    const existing = await this.clubRepo.findOne({
      where: { name: event.groupName },
    });
    if (existing && (existing as Club & { imGroupId?: string }).imGroupId === event.groupID) {
      this.logger.log(`[group.create] group=${event.groupID} 已绑定俱乐部 ${existing.id}`);
      return {
        success: true,
        message: 'club already exists',
        sideEffects: { clubId: existing.id },
      };
    }

    // 检查群主是否在业务库
    const owner = await this.userRepo.findOne({ where: { id: event.ownerUserID } });
    if (!owner) {
      this.logger.warn(
        `[group.create] owner=${event.ownerUserID} 不在业务库，跳过俱乐部创建`,
      );
      return {
        success: true,
        message: 'owner not in business db',
      };
    }

    // 创建俱乐部
    // 注：这里用默认的 gameTag（"综合"），后续可通过 OpenIM ex 字段传递分类标签
    const club = await this.clubService.create({
      name: event.groupName.slice(0, 128),
      gameTag: '综合',
      description: event.introduction ?? null,
      iconUrl: event.faceURL ?? null,
      ownerId: event.ownerUserID,
    });

    this.logger.log(
      `[group.create] 为群组 ${event.groupID} 创建俱乐部 ${club.id}（owner=${event.ownerUserID}）`,
    );

    return {
      success: true,
      message: 'club created',
      sideEffects: { clubId: club.id, groupId: event.groupID },
    };
  }

  /* ============================================================
   * Handler: message.send
   * ============================================================ */

  /**
   * 处理消息发送事件
   * - 仅群聊消息做关键词检测
   * - V2.0 关键词逻辑预留：当前只记录事件，不实际触发业务
   */
  private async handleMessageSend(event: MessageSendEvent): Promise<WebhookHandlerResult> {
    // 仅处理群聊 + 文本消息
    if (event.sessionType !== 'group' || !event.content) {
      return { success: true, message: 'non-group or non-text, ignored' };
    }

    // 关键词匹配
    const matched = OpenIMWebhookService.KEYWORD_RULES.find((rule) =>
      rule.keyword.test(event.content ?? ''),
    );

    if (!matched) {
      return { success: true, message: 'no keyword matched' };
    }

    // 预留：V2.0 在此触发业务逻辑
    // - beast → TerritoryService.triggerDefenseEvent(...)
    // - team  → createTeamInvite(...)
    // - help  → notifyHelpers(...)
    this.logger.log(
      `[message.send] keyword matched scene=${matched.scene} by=${event.sendID} group=${event.groupID ?? '-'}`,
    );

    // V1.0：仅记录到结构化日志，不实际触发业务（避免无 UI 支持的副作用）
    return {
      success: true,
      message: 'keyword detected, reserved for V2.0',
      sideEffects: {
        keywordScene: matched.scene,
        keywordLabel: matched.label,
        senderId: event.sendID,
        groupId: event.groupID,
        clientMsgId: event.clientMsgID,
      },
    };
  }

  /* ============================================================
   * 内部工具
   * ============================================================ */

  /**
   * 幂等去重：返回 true 表示首次处理，false 表示重复事件
   * - 使用 Redis SETNX (set with NX option)
   */
  private async markProcessedIfFirst(key: string): Promise<boolean> {
    const ok = await this.redis.raw.set(
      key,
      '1',
      'EX',
      OpenIMWebhookService.IDEMPOTENCY_TTL_SEC,
      'NX',
    );
    return ok === 'OK';
  }
}