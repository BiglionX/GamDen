import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * uni-push（个推）REST API 客户端
 *
 * 参考：https://docs.getui.com/getui/server/rest_v2/common/
 *
 * 主要接口：
 *  1. 鉴权  POST {apiBase}/v2/{appId}/auth   body: { sign, timestamp, appkey }
 *  2. 单推  POST {restBase}/v2/{appId}/push/single/cid
 *  3. 批量  POST {restBase}/v2/{appId}/push/list/cid
 *  4. 注销 token POST {restBase}/v2/{appId}/user/cid/{cid}/unbind
 *
 * 鉴权 token 默认 24h 有效，本实现带过期缓存与并发去重。
 * 签名：SHA256(appkey + timestamp + mastersecret)
 *
 * 启用条件：PUSH_USE_MOCK=false 且 UNIPUSH_APPID/APPKEY/MASTERSECRET 都已配置
 * 否则 PushService 仍走 mock 实现（仅日志），保证本地/CI 正常运行。
 */
export interface UnipushAuthResponse {
  code: number;
  msg: string;
  data?: { token: string; expire_time: string };
}

export interface UnipushPushResult {
  code: number;
  msg: string;
  data?: { taskid?: string };
}

/**
 * 单推 / 批推的 payload（个推 v2 简化版）
 */
export interface UnipushSinglePushBody {
  request_id: string;
  audience: { cid: string[] };
  push_message: {
    notification: {
      title: string;
      body: string;
      click_type?: 'intent' | 'url' | 'payload' | 'startapp' | 'none';
      url?: string;
      intent?: string;
      payload?: string;
    };
    /** 透传（客户端离线收不到，客户端在线时透传） */
    transmission?: { transmission_content: string; transmission_type?: 'unicast' | 'broadcast' };
  };
  /** 厂商通道策略（Android 离线推送） */
  channel?: { android?: { ups?: { notification?: Record<string, unknown> } } };
}

@Injectable()
export class UnipushClient {
  private readonly logger = new Logger(UnipushClient.name);
  private readonly useMock: boolean;
  private readonly appId: string;
  private readonly appKey: string;
  private readonly masterSecret: string;
  private readonly apiBase: string;
  private readonly restBase: string;

  /** 鉴权 token 缓存 */
  private authToken: string | null = null;
  private authTokenExpireAt = 0;
  /** 并发去重：多个请求同时触发时复用同一个鉴权 Promise */
  private authInflight: Promise<string> | null = null;

  constructor(config: ConfigService) {
    this.useMock = (config.get<string>('PUSH_USE_MOCK') ?? 'true') === 'true';
    this.appId = config.get<string>('UNIPUSH_APPID') ?? '';
    this.appKey = config.get<string>('UNIPUSH_APPKEY') ?? '';
    this.masterSecret = config.get<string>('UNIPUSH_MASTERSECRET') ?? '';
    this.apiBase = config.get<string>('UNIPUSH_API_BASE') ?? 'https://api.getui.com';
    this.restBase = config.get<string>('UNIPUSH_REST_BASE') ?? 'https://restapi.getui.com';

    if (this.useMock) {
      this.logger.log('[unipush] PUSH_USE_MOCK=true，跳过真实推送（仅日志）');
    } else if (!this.appId || !this.appKey || !this.masterSecret) {
      this.logger.warn(
        '[unipush] PUSH_USE_MOCK=false 但 UNIPUSH_APPID/APPKEY/MASTERSECRET 未配置完整，将回退到 mock',
      );
    } else {
      this.logger.log(`[unipush] 已启用真实推送 appId=${this.appId.slice(0, 6)}***`);
    }
  }

  /**
   * 是否启用真实推送（用于上层判断）
   */
  isLive(): boolean {
    return !this.useMock && !!this.appId && !!this.appKey && !!this.masterSecret;
  }

  /**
   * SHA256(appkey + timestamp + mastersecret)
   */
  private sign(timestamp: number): string {
    return createHash('sha256')
      .update(this.appKey + timestamp + this.masterSecret)
      .digest('hex');
  }

  /**
   * 获取/刷新鉴权 token
   * - token 默认 24h，提前 5 分钟刷新
   */
  async getAuthToken(): Promise<string> {
    if (!this.isLive()) {
      throw new Error('unipush not configured');
    }
    const now = Date.now();
    if (this.authToken && this.authTokenExpireAt > now + 5 * 60 * 1000) {
      return this.authToken;
    }
    if (this.authInflight) {
      return this.authInflight;
    }
    this.authInflight = (async () => {
      try {
        const timestamp = Math.floor(now / 1000);
        const sign = this.sign(timestamp);
        const url = `${this.apiBase}/v2/${this.appId}/auth`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ sign, timestamp: String(timestamp), appkey: this.appKey }),
        });
        if (!resp.ok) {
          throw new Error(`unipush auth HTTP ${resp.status}: ${await resp.text()}`);
        }
        const json = (await resp.json()) as UnipushAuthResponse;
        if (json.code !== 0 || !json.data?.token) {
          throw new Error(`unipush auth failed code=${json.code} msg=${json.msg}`);
        }
        this.authToken = json.data.token;
        // 默认 1 天（个推 24h），提前 5 分钟刷
        this.authTokenExpireAt = now + 23 * 60 * 60 * 1000;
        this.logger.debug(`[unipush] auth token refreshed expireAt=${new Date(this.authTokenExpireAt).toISOString()}`);
        return this.authToken;
      } finally {
        this.authInflight = null;
      }
    })();
    return this.authInflight;
  }

  /**
   * 单推 / 批量推（按 cid 列表）
   * - 失败抛出异常（上层用 try/catch 记录）
   * - mock 模式下不调用接口，直接返回成功
   */
  async pushByCids(
    cids: string[],
    payload: UnipushSinglePushBody,
  ): Promise<UnipushPushResult> {
    if (cids.length === 0) {
      return { code: 0, msg: 'empty cids, skipped' };
    }
    if (!this.isLive()) {
      this.logger.log(
        `[unipush/mock] push cids=${cids.length} sample=${cids[0]?.slice(0, 8)}*** ` +
          `title="${payload.push_message.notification.title}" ` +
          `body="${payload.push_message.notification.body}"`,
      );
      return { code: 0, msg: 'mock', data: { taskid: `mock_${Date.now()}` } };
    }

    const token = await this.getAuthToken();
    const url =
      cids.length === 1
        ? `${this.restBase}/v2/${this.appId}/push/single/cid`
        : `${this.restBase}/v2/${this.appId}/push/list/cid`;

    // 批推时需要传 cid 列表；单推时也支持 cid，但 single/cid 是最简形式
    const body: UnipushSinglePushBody = { ...payload, audience: { cid: cids } };

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            token,
          },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        let json: UnipushPushResult;
        try {
          json = JSON.parse(text) as UnipushPushResult;
        } catch {
          throw new Error(`unipush push non-JSON HTTP ${resp.status}: ${text.slice(0, 200)}`);
        }
        if (!resp.ok || (json.code !== 0 && json.code !== 20001 /* 任务已完成忽略 */)) {
          // token 失效时刷新一次重试
          if (resp.status === 401 || json.code === 10001 /* token 过期 */) {
            this.authToken = null;
            this.authTokenExpireAt = 0;
            continue;
          }
          throw new Error(`unipush push failed code=${json.code} msg=${json.msg}`);
        }
        return json;
      } catch (e) {
        lastErr = e;
        this.logger.warn(
          `[unipush] push attempt=${attempt + 1} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}
