import { registerAs } from '@nestjs/config';

/**
 * OpenIM 服务端集成配置
 *
 * 关键变量：
 *  - apiURL      OpenIM Server HTTP 地址（如 http://127.0.0.1:10002）
 *  - wsURL       OpenIM WebSocket 网关地址（前端用，服务端一般不用）
 *  - adminUserID OpenIM 管理员账号（user_register 时鉴权）
 *  - adminToken  OpenIM 管理员 Token（admin_login 后获取，长期不变）
 *  - tokenSecret 用于本地签发 mock token 的密钥（仅当 USE_MOCK=true 时生效）
 *  - tokenTtl    IM token 有效期（秒，默认 7 天）
 *  - useMock     是否使用 mock 实现（开发环境无 OpenIM Server 时设 true）
 *
 * 真实环境使用示例（部署好 OpenIM Server 后）：
 *   OPENIM_API_URL=http://openim-server:10002
 *   OPENIM_ADMIN_USERID=admin
 *   OPENIM_ADMIN_TOKEN=<管理员 token，通过 admin_login 获取>
 *   OPENIM_USE_MOCK=false
 */
export default registerAs('im', () => ({
  apiURL: process.env.OPENIM_API_URL ?? 'http://127.0.0.1:10002',
  wsURL: process.env.OPENIM_WS_URL ?? 'ws://127.0.0.1:10001',
  adminUserID: process.env.OPENIM_ADMIN_USERID ?? 'admin',
  adminToken: process.env.OPENIM_ADMIN_TOKEN ?? '',
  callbackURL: process.env.OPENIM_CALLBACK_URL ?? '',

  /** mock token 签名密钥（仅 mock 模式使用） */
  tokenSecret: process.env.OPENIM_TOKEN_SECRET ?? 'change-me-im-secret',
  /** IM token 有效期（秒） */
  tokenTtl: parseInt(process.env.OPENIM_TOKEN_TTL ?? `${7 * 24 * 3600}`, 10),
  /** 是否使用 mock 实现（true=本地签发 token, false=真实调用 OpenIM） */
  useMock:
    (process.env.OPENIM_USE_MOCK ?? 'true').toLowerCase() === 'true',

  /**
   * OpenIM Webhook 回调密钥（HMAC-SHA256 signing key）
   * - 必须与 OpenIM 服务端 callback 配置的密钥保持一致
   * - WebhookSignatureGuard 用此密钥校验每个请求的 x-openim-signature
   */
  webhookSecret:
    process.env.OPENIM_WEBHOOK_SECRET ??
    process.env.OPENIM_CALLBACK_SECRET ??
    '',
  /**
   * 是否跳过 Webhook 签名校验（仅 dev/test 环境使用）
   * - 生产环境必须为 false
   */
  webhookSkipVerify:
    (process.env.OPENIM_WEBHOOK_SKIP_VERIFY ?? 'false').toLowerCase() === 'true',
}));