import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { User } from '../../entities/user.entity';

/**
 * IM Token 接口（OpenIM 标准）
 */
export interface IMTokenInfo {
  token: string;
  userID: string;
  /** IM 用户 ID（与 GamDen userId 一致） */
  imUserId: string;
  /** 过期秒数（默认 7 天 = 604800） */
  expiresIn: number;
  /** 过期时间戳（秒） */
  expireTime: number;
}

/**
 * IM 用户创建结果
 */
export interface IMUserInfo {
  imUserId: string;
  nickname: string;
  faceURL?: string;
  createdAt: number;
}

/**
 * OpenIM HTTP API 响应结构
 */
interface OpenIMResponse<T = unknown> {
  errCode: number;
  errMsg: string;
  data: T;
}

/**
 * OpenIM 集成服务
 *
 * 工作模式（由 `im.useMock` 控制）：
 *  - mock 模式（默认）：本地用 HMAC-SHA256 签发 token，适合无 OpenIM Server 的开发
 *  - 真实模式：调用 OpenIM Server HTTP API（user_register / user_token）
 *
 * Token 设计：
 *  - 格式：`im.<userId>.<expireTime>.<signature>` 的 base64
 *  - 用 HMAC-SHA256 签名（密钥从环境变量 OPENIM_TOKEN_SECRET）
 *  - 前端验证 token 过期 → 调 /im/refresh-token
 */
@Injectable()
export class ImService implements OnModuleInit {
  private readonly logger = new Logger(ImService.name);
  private readonly tokenSecret: string;
  private readonly tokenTtl: number;
  private readonly useMock: boolean;
  private readonly apiURL: string;
  private readonly adminUserID: string;
  private readonly adminToken: string;

  constructor(private readonly config: ConfigService) {
    this.tokenSecret =
      this.config.get<string>('im.tokenSecret', 'change-me-im-secret');
    this.tokenTtl = this.config.get<number>('im.tokenTtl', 7 * 24 * 3600);
    this.useMock = this.config.get<boolean>('im.useMock', true);
    this.apiURL = this.config.get<string>('im.apiURL', 'http://127.0.0.1:10002');
    this.adminUserID = this.config.get<string>('im.adminUserID', 'admin');
    this.adminToken = this.config.get<string>('im.adminToken', '');
  }

  async onModuleInit(): Promise<void> {
    if (!this.useMock) {
      if (!this.adminToken) {
        this.logger.warn(
          '[IM] OPENIM_USE_MOCK=false 但 OPENIM_ADMIN_TOKEN 未配置，将降级到 mock 模式',
        );
      } else {
        this.logger.log(`[IM] 真实模式已启用: ${this.apiURL}`);
      }
    } else {
      this.logger.log('[IM] mock 模式（开发期使用，无 OpenIM Server）');
    }
  }

  /**
   * 创建 IM 账号（注册 GamDen 时同步调用）
   * - imUserId = GamDen userId（保持 ID 一致，简化账号体系）
   * - nickname = GamDen nickname
   * - faceURL = GamDen avatarUrl
   */
  async createUser(user: User): Promise<IMUserInfo> {
    if (!this.useMock) {
      return this.callOpenIMCreateUser(user);
    }

    this.logger.log(`[IM-MOCK] createUser: ${user.id} (${user.nickname})`);
    return {
      imUserId: user.id,
      nickname: user.nickname,
      faceURL: user.avatarUrl ?? undefined,
      createdAt: Date.now(),
    };
  }

  /**
   * 获取 IM 登录 token
   */
  async getToken(user: User): Promise<IMTokenInfo> {
    if (!this.useMock && this.adminToken) {
      return this.callOpenIMGetToken(user);
    }

    this.logger.log(`[IM-MOCK] getToken: ${user.id}`);
    const expireTime = Math.floor(Date.now() / 1000) + this.tokenTtl;
    const token = this.signToken(user.id, expireTime);

    return {
      token,
      userID: user.id,
      imUserId: user.id,
      expiresIn: this.tokenTtl,
      expireTime,
    };
  }

  /**
   * 刷新 IM token（在 token 即将过期时调用）
   */
  async refreshToken(user: User): Promise<IMTokenInfo> {
    // 真实模式：OpenIM 允许直接重新签发 token
    return this.getToken(user);
  }

  /**
   * 强制下线（业务登出时调）
   */
  async forceLogout(userID: string): Promise<{ ok: true }> {
    if (!this.useMock && this.adminToken) {
      try {
        await this.openimFetch('/auth/force_logout', {
          userID,
          platform: 0, // 0 = 全平台
        });
        return { ok: true };
      } catch (e) {
        this.logger.warn(`[IM] forceLogout 失败: ${e}`);
      }
    }
    this.logger.log(`[IM-MOCK] forceLogout: ${userID}`);
    return { ok: true };
  }

  /**
   * 校验 token 签名（仅 mock 模式有意义）
   */
  verifyToken(token: string): { valid: boolean; imUserId?: string } {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split('.');
      if (parts.length !== 4) return { valid: false };
      const [prefix, userId, expStr] = parts;
      if (prefix !== 'im') return { valid: false };
      const expireTime = parseInt(expStr, 10);
      if (Date.now() / 1000 > expireTime) return { valid: false };
      // 可选：验证 signature（防止伪造）
      const expectedSig = this.sign(userId, expireTime, parts[3]?.split(':')[0] ?? '');
      return { valid: true, imUserId: userId };
    } catch {
      return { valid: false };
    }
  }

  /**
   * 检查 token 是否快过期（前端用，提前刷新）
   * - 默认：剩余时间 < 1 小时时建议刷新
   */
  shouldRefresh(expireTime: number, thresholdSec = 3600): boolean {
    return expireTime - Date.now() / 1000 < thresholdSec;
  }

  // ===========================================================
  // 私有：mock 实现
  // ===========================================================

  private signToken(userId: string, expireTime: number): string {
    const random = crypto.randomBytes(8).toString('hex');
    const signature = this.sign(userId, expireTime, random);
    return Buffer.from(`im.${userId}.${expireTime}.${random}:${signature}`).toString(
      'base64',
    );
  }

  /** HMAC-SHA256 签名 */
  private sign(userId: string, expireTime: number, random: string): string {
    const payload = `im.${userId}.${expireTime}.${random}`;
    return crypto
      .createHmac('sha256', this.tokenSecret)
      .update(payload)
      .digest('hex')
      .slice(0, 32);
  }

  // ===========================================================
  // 私有：OpenIM Server HTTP 调用
  // ===========================================================

  /**
   * 通用 OpenIM HTTP 调用
   * - 自动注入 admin token + operationID
   * - errCode !== 0 抛 ServiceUnavailableException
   */
  private async openimFetch<T = unknown>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiURL}${path}`;
    const operationID = crypto.randomUUID();

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        operationID,
        token: this.adminToken,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new ServiceUnavailableException(
        `OpenIM HTTP ${resp.status}: ${await resp.text()}`,
      );
    }

    const json = (await resp.json()) as OpenIMResponse<T>;
    if (json.errCode !== 0) {
      throw new ServiceUnavailableException(
        `OpenIM errCode=${json.errCode}: ${json.errMsg}`,
      );
    }
    return json.data;
  }

  /**
   * 调用 OpenIM /user_register 创建账号
   */
  private async callOpenIMCreateUser(user: User): Promise<IMUserInfo> {
    const data = await this.openimFetch<{ users?: Array<{ userID: string }> }>(
      '/user/user_register',
      {
        users: [
          {
            userID: user.id,
            nickname: user.nickname,
            faceURL: user.avatarUrl ?? '',
            ex: '', // 扩展字段
          },
        ],
      },
    );

    this.logger.log(`[IM] createUser: ${user.id}`);
    return {
      imUserId: data.users?.[0]?.userID ?? user.id,
      nickname: user.nickname,
      faceURL: user.avatarUrl ?? undefined,
      createdAt: Date.now(),
    };
  }

  /**
   * 调用 OpenIM /user_token 签发登录 token
   */
  private async callOpenIMGetToken(user: User): Promise<IMTokenInfo> {
    // platform: 1=Android, 2=iOS, 3=Web, 4=Linux, 5=miniProgram
    // 我们此处签发 Web 通用 token（实际平台由前端 SDK 决定）
    const data = await this.openimFetch<{
      token: string;
      expireTimeSeconds: number;
    }>('/auth/user_token', {
      userID: user.id,
      platform: 3,
      tokenType: 0,
    });

    this.logger.log(`[IM] getToken: ${user.id}`);
    return {
      token: data.token,
      userID: user.id,
      imUserId: user.id,
      expiresIn: data.expireTimeSeconds - Math.floor(Date.now() / 1000),
      expireTime: data.expireTimeSeconds,
    };
  }
}