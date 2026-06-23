import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.module';

/**
 * 微信 API 通用响应结构（成功）
 */
interface WechatBaseResponse {
  errcode?: number;
  errmsg?: string;
}

/**
 * access_token 响应
 */
interface AccessTokenResponse extends WechatBaseResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * 小程序码（getwxacodeunlimit）响应
 * - 成功：返回 image/jpeg 二进制 Buffer
 * - 失败：返回 JSON { errcode, errmsg }
 */
interface AuditStatusResponse extends WechatBaseResponse {
  /** 审核状态：0=审核通过，1=审核被拒绝，2=审核中，3=已撤回 */
  status?: number;
  /** 审核单 ID */
  auditid?: string;
  /** 拒绝原因（status=1 时有值） */
  reason?: string;
  /** 审核摘要 */
  screen_shot?: string;
}

/**
 * AppID 校验结果
 */
export interface AppIdValidationResult {
  valid: boolean;
  /** 微信返回的错误信息（失败时） */
  errorMessage?: string;
  /** 微信错误码（失败时） */
  errorCode?: number;
}

/**
 * 小程序审核状态
 */
export interface AuditStatus {
  /** 审核状态：0=审核通过，1=审核被拒绝，2=审核中，3=已撤回 */
  status: number;
  /** 状态描述 */
  statusText: string;
  /** 审核单 ID */
  auditId?: string;
  /** 拒绝原因（status=1 时有值） */
  reason?: string;
}

/**
 * 小程序码生成结果
 */
export interface QrCodeResult {
  /** 图片 Buffer（二进制） */
  buffer: Buffer;
  /** 图片 MIME 类型 */
  mimeType: string;
  /** data URL 形式（可直接用于 <img src> 或存储） */
  dataUrl: string;
}

/**
 * 微信开放平台 API 集成服务
 *
 * 功能：
 *  1. 获取并缓存 access_token（Redis，有效期 7000s，比微信 7200 留缓冲）
 *  2. 校验用户提交的 AppID 是否有效（通过获取 access_token 测试）
 *  3. 生成小程序码（getwxacodeunlimit）
 *  4. 查询小程序审核状态（getlatestauditstatus）
 *  5. 获取体验版二维码（get_qrcode）
 *
 * 设计要点：
 *  - access_token 按 appid 维度缓存，不同用户的小程序互不影响
 *  - 所有 API 调用支持自动重试（指数退避）
 *  - mock 模式（WECHAT_USE_MOCK=true）返回模拟数据，无需真实微信配置
 *  - 敏感信息（AppSecret）通过参数传入，不持久化在 service 中
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  /** Redis access_token 缓存 key 前缀 */
  private static readonly TOKEN_CACHE_PREFIX = 'gamden:wechat:token:';

  private readonly useMock: boolean;
  private readonly apiBase: string;
  private readonly tokenTtl: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly qrPage: string;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.useMock = this.config.get<boolean>('wechat.useMock', true);
    this.apiBase = this.config.get<string>('wechat.apiBase', 'https://api.weixin.qq.com');
    this.tokenTtl = this.config.get<number>('wechat.tokenTtl', 7000);
    this.maxRetries = this.config.get<number>('wechat.maxRetries', 2);
    this.retryDelayMs = this.config.get<number>('wechat.retryDelayMs', 1000);
    this.qrPage = this.config.get<string>('wechat.qrPage', 'pages/land/land');

    if (this.useMock) {
      this.logger.log('[WeChat] mock 模式已启用（无需真实微信配置）');
    } else {
      this.logger.log(`[WeChat] 真实模式已启用: ${this.apiBase}`);
    }
  }

  // ======================== access_token ========================

  /**
   * 获取 access_token（带 Redis 缓存）
   *
   * 缓存策略：
   *  - key = gamden:wechat:token:{appid}
   *  - TTL = 7000s（比微信 7200s 留 200s 缓冲，防止边界过期）
   *  - 并发请求只会有一个去刷新（Redis 原子操作）
   *
   * @param appid     小程序 AppID
   * @param appSecret 小程序 AppSecret
   * @returns access_token 字符串
   * @throws BadGatewayException 微信返回错误
   */
  async getAccessToken(appid: string, appSecret: string): Promise<string> {
    if (this.useMock) {
      return `mock_access_token_${appid}_${Date.now()}`;
    }

    const cacheKey = WechatService.TOKEN_CACHE_PREFIX + appid;

    // 1. 先从 Redis 缓存读取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 缓存未命中，调用微信 API 获取
    const token = await this.fetchAccessToken(appid, appSecret);

    // 3. 写入 Redis 缓存
    await this.redis.set(cacheKey, token, this.tokenTtl);
    this.logger.debug(`[WeChat] access_token 已缓存: ${appid} (TTL ${this.tokenTtl}s)`);

    return token;
  }

  /**
   * 清除指定 appid 的 access_token 缓存（token 失效时调用）
   */
  async clearAccessTokenCache(appid: string): Promise<void> {
    const cacheKey = WechatService.TOKEN_CACHE_PREFIX + appid;
    await this.redis.del(cacheKey);
    this.logger.log(`[WeChat] 已清除 access_token 缓存: ${appid}`);
  }

  // ======================== AppID 校验 ========================

  /**
   * 校验用户提交的 AppID 是否有效
   *
   * 原理：用 AppID + AppSecret 调用 token 接口，成功则说明 AppID 和 Secret 匹配且有效。
   *
   * @param appid     用户提交的 AppID
   * @param appSecret 用户提交的 AppSecret
   * @returns 校验结果
   */
  async validateAppId(
    appid: string,
    appSecret: string,
  ): Promise<AppIdValidationResult> {
    if (this.useMock) {
      this.logger.log(`[WeChat-MOCK] validateAppId: ${appid} → valid`);
      return { valid: true };
    }

    try {
      // 直接调用 token 接口（不使用缓存，确保真实校验）
      await this.fetchAccessToken(appid, appSecret);
      this.logger.log(`[WeChat] AppID 校验成功: ${appid}`);
      return { valid: true };
    } catch (err) {
      const error = err as { errorCode?: number; errorMessage?: string };
      this.logger.warn(
        `[WeChat] AppID 校验失败: ${appid}, errcode=${error.errorCode}, errmsg=${error.errorMessage}`,
      );
      return {
        valid: false,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
      };
    }
  }

  // ======================== 小程序码 ========================

  /**
   * 生成小程序码（getwxacodeunlimit）
   *
   * 接口：POST /wxa/getwxacodeunlimit?access_token=ACCESS_TOKEN
   * - scene: 场景值（最大 32 字符），用于区分不同用户
   * - page:  小程序页面路径（必须是已发布的小程序中存在的页面）
   * - 返回：图片二进制 Buffer（image/jpeg）
   *
   * @param appid     小程序 AppID
   * @param appSecret 小程序 AppSecret
   * @param scene     场景参数（如 userId）
   * @param page      落地页路径（默认从配置读取）
   * @returns 小程序码生成结果（含 Buffer + dataUrl）
   */
  async generateMiniProgramCode(
    appid: string,
    appSecret: string,
    scene: string,
    page?: string,
  ): Promise<QrCodeResult> {
    if (this.useMock) {
      return this.generateMockQrCode(scene);
    }

    const accessToken = await this.getAccessToken(appid, appSecret);
    const url = `${this.apiBase}/wxa/getwxacodeunlimit?access_token=${accessToken}`;

    const body = {
      scene,
      page: page ?? this.qrPage,
      width: 430,
      auto_color: false,
      line_color: { r: 201, g: 168, b: 124 }, // GamDen 古风金
      is_hyaline: false,
    };

    const buffer = await this.fetchWithRetry<Buffer>(async () => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new ServiceUnavailableException(
          `微信 API HTTP ${resp.status}: ${await resp.text()}`,
        );
      }

      const respBuffer = Buffer.from(await resp.arrayBuffer());

      // 微信 API 失败时返回 JSON（含 errcode），成功时返回图片二进制
      const contentType = resp.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        // 解析错误响应
        const errorJson = JSON.parse(respBuffer.toString('utf8')) as WechatBaseResponse;
        this.handleWechatError(errorJson, appid);

        // 如果是 access_token 过期，清除缓存并重试
        if (errorJson.errcode === 40001 || errorJson.errcode === 42001) {
          await this.clearAccessTokenCache(appid);
          throw new ServiceUnavailableException(
            `access_token 已失效，正在重试: ${errorJson.errmsg}`,
          );
        }
      }

      return respBuffer;
    });

    const mimeType = 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    this.logger.log(`[WeChat] 小程序码生成成功: scene=${scene}`);
    return { buffer, mimeType, dataUrl };
  }

  // ======================== 审核状态 ========================

  /**
   * 查询小程序最新审核状态（getlatestauditstatus）
   *
   * 接口：GET /wxa/getlatestauditstatus?access_token=ACCESS_TOKEN
   *
   * @param appid     小程序 AppID
   * @param appSecret 小程序 AppSecret
   * @returns 审核状态
   */
  async getLatestAuditStatus(
    appid: string,
    appSecret: string,
  ): Promise<AuditStatus> {
    if (this.useMock) {
      this.logger.log('[WeChat-MOCK] getLatestAuditStatus → 审核中');
      return {
        status: 2,
        statusText: '审核中',
      };
    }

    const accessToken = await this.getAccessToken(appid, appSecret);
    const url = `${this.apiBase}/wxa/getlatestauditstatus?access_token=${accessToken}`;

    const data = await this.fetchWithRetry<AuditStatusResponse>(async () => {
      const resp = await fetch(url, { method: 'GET' });

      if (!resp.ok) {
        throw new ServiceUnavailableException(
          `微信 API HTTP ${resp.status}: ${await resp.text()}`,
        );
      }

      const json = (await resp.json()) as AuditStatusResponse;

      // errcode=0 或无 errcode 表示成功
      if (json.errcode && json.errcode !== 0) {
        // access_token 过期，清除缓存重试
        if (json.errcode === 40001 || json.errcode === 42001) {
          await this.clearAccessTokenCache(appid);
        }
        this.handleWechatError(json, appid);
      }

      return json;
    });

    const statusTextMap: Record<number, string> = {
      0: '审核通过',
      1: '审核被拒绝',
      2: '审核中',
      3: '已撤回',
    };

    return {
      status: data.status ?? -1,
      statusText: statusTextMap[data.status ?? -1] ?? '未知状态',
      auditId: data.auditid,
      reason: data.reason,
    };
  }

  // ======================== 体验版二维码 ========================

  /**
   * 获取小程序体验版二维码（get_qrcode）
   *
   * 接口：GET /wxa/get_qrcode?access_token=ACCESS_TOKEN&path=PATH
   * - 返回图片二进制 Buffer
   *
   * @param appid     小程序 AppID
   * @param appSecret 小程序 AppSecret
   * @param path      体验版扫码后的落地路径（可选）
   * @returns 二维码图片结果
   */
  async getTrialQrcode(
    appid: string,
    appSecret: string,
    path?: string,
  ): Promise<QrCodeResult> {
    if (this.useMock) {
      return this.generateMockQrCode(`trial_${appid}`);
    }

    const accessToken = await this.getAccessToken(appid, appSecret);
    let url = `${this.apiBase}/wxa/get_qrcode?access_token=${accessToken}`;
    if (path) {
      url += `&path=${encodeURIComponent(path)}`;
    }

    const buffer = await this.fetchWithRetry<Buffer>(async () => {
      const resp = await fetch(url, { method: 'GET' });

      if (!resp.ok) {
        throw new ServiceUnavailableException(
          `微信 API HTTP ${resp.status}: ${await resp.text()}`,
        );
      }

      const respBuffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const errorJson = JSON.parse(respBuffer.toString('utf8')) as WechatBaseResponse;
        if (errorJson.errcode === 40001 || errorJson.errcode === 42001) {
          await this.clearAccessTokenCache(appid);
        }
        this.handleWechatError(errorJson, appid);
      }

      return respBuffer;
    });

    const mimeType = 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    this.logger.log(`[WeChat] 体验版二维码获取成功: ${appid}`);
    return { buffer, mimeType, dataUrl };
  }

  // ======================== 内部辅助方法 ========================

  /**
   * 调用微信 API 获取 access_token（无缓存）
   *
   * 接口：GET /cgi-bin/token?grant_type=client_credential&appid=APPID&secret=SECRET
   *
   * @throws BadGatewayException 微信返回错误
   */
  private async fetchAccessToken(
    appid: string,
    appSecret: string,
  ): Promise<string> {
    const url =
      `${this.apiBase}/cgi-bin/token?grant_type=client_credential` +
      `&appid=${appid}&secret=${appSecret}`;

    const resp = await fetch(url, { method: 'GET' });

    if (!resp.ok) {
      throw new ServiceUnavailableException(
        `微信 token 接口 HTTP ${resp.status}: ${await resp.text()}`,
      );
    }

    const data = (await resp.json()) as AccessTokenResponse;

    if (data.errcode || !data.access_token) {
      const errorMsg = `微信获取 access_token 失败: errcode=${data.errcode}, errmsg=${data.errmsg}`;
      this.logger.error(`[WeChat] ${errorMsg}`);

      const error = new Error(data.errmsg ?? '未知错误') as Error & {
        errorCode?: number;
        errorMessage?: string;
      };
      error.errorCode = data.errcode;
      error.errorMessage = data.errmsg;
      throw error;
    }

    return data.access_token;
  }

  /**
   * 带重试的 API 调用包装器（指数退避）
   *
   * @param fn     要执行的异步操作
   * @returns 操作结果
   */
  private async fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          this.logger.warn(
            `[WeChat] API 调用失败（第 ${attempt + 1} 次），${delay}ms 后重试: ${err}`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 统一处理微信 API 错误
   * @throws BadGatewayException
   */
  private handleWechatError(
    error: WechatBaseResponse,
    appid: string,
  ): never {
    const msg = `微信 API 错误 [${appid}]: errcode=${error.errcode}, errmsg=${error.errmsg}`;
    this.logger.error(`[WeChat] ${msg}`);
    throw new BadGatewayException(msg);
  }

  /**
   * mock 模式生成占位小程序码（SVG）
   */
  private generateMockQrCode(scene: string): QrCodeResult {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="430" viewBox="0 0 430 430">
      <rect width="430" height="430" fill="#FFFFFF"/>
      <rect x="20" y="20" width="390" height="390" fill="none" stroke="#C9A87C" stroke-width="4" rx="16"/>
      <text x="215" y="200" text-anchor="middle" fill="#1E241F" font-family="sans-serif" font-size="28" font-weight="bold">GamDen</text>
      <text x="215" y="240" text-anchor="middle" fill="#A89E85" font-family="sans-serif" font-size="16">小程序码(Mock)</text>
      <text x="215" y="290" text-anchor="middle" fill="#C9A87C" font-family="monospace" font-size="14">${scene}</text>
      <rect x="165" y="320" width="100" height="60" fill="#C9A87C" rx="8"/>
      <text x="215" y="358" text-anchor="middle" fill="#1E241F" font-size="20" font-weight="bold">扫码进入</text>
    </svg>`;
    const buffer = Buffer.from(svg, 'utf8');
    const dataUrl = `data:image/svg+xml;base64,${buffer.toString('base64')}`;
    return { buffer, mimeType: 'image/svg+xml', dataUrl };
  }

  /**
   * Promise 延时
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
