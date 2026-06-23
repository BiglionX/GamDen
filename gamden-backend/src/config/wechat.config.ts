import { registerAs } from '@nestjs/config';

/**
 * 微信开放平台 / 小程序集成配置
 *
 * 环境变量：
 *  - WECHAT_USE_MOCK          是否使用 mock 模式（开发环境 true，生产环境 false）
 *  - WECHAT_API_BASE          微信 API 基础地址（默认 https://api.weixin.qq.com）
 *  - WECHAT_PLATFORM_APPID    平台主体小程序 AppID（用于平台级操作）
 *  - WECHAT_PLATFORM_SECRET   平台主体小程序 AppSecret（敏感，不入 git）
 *  - WECHAT_TOKEN_TTL         access_token 缓存有效期（秒，默认 7000，比微信 7200 留 200s 缓冲）
 *  - WECHAT_MAX_RETRIES       API 调用失败重试次数（默认 2）
 *  - WECHAT_RETRY_DELAY_MS    重试间隔基础延迟（毫秒，默认 1000）
 *  - WECHAT_QR_PAGE           小程序码默认落地页路径
 *
 * 主体类型认证费用参考：
 *  - individual  个人主体     30 元/年
 *  - enterprise  企业/个体户   300 元/年
 */
export default registerAs('wechat', () => ({
  /** 是否使用 mock 模式（无真实微信配置时返回模拟数据） */
  useMock: (process.env.WECHAT_USE_MOCK ?? 'true').toLowerCase() === 'true',

  /** 微信 API 基础地址 */
  apiBase: process.env.WECHAT_API_BASE ?? 'https://api.weixin.qq.com',

  /** 平台主体小程序 AppID（用于平台级操作，如生成体验码） */
  platformAppId: process.env.WECHAT_PLATFORM_APPID ?? '',

  /** 平台主体小程序 AppSecret（敏感信息，仅在环境变量中配置） */
  platformSecret: process.env.WECHAT_PLATFORM_SECRET ?? '',

  /** access_token 缓存有效期（秒，默认 7000，比微信 7200 留 200s 缓冲） */
  tokenTtl: parseInt(process.env.WECHAT_TOKEN_TTL ?? '7000', 10),

  /** API 调用失败重试次数 */
  maxRetries: parseInt(process.env.WECHAT_MAX_RETRIES ?? '2', 10),

  /** 重试基础延迟（毫秒，指数退避：delay * 2^attempt） */
  retryDelayMs: parseInt(process.env.WECHAT_RETRY_DELAY_MS ?? '1000', 10),

  /** 小程序码默认落地页路径 */
  qrPage: process.env.WECHAT_QR_PAGE ?? 'pages/land/land',

  /**
   * 认证主体费用信息（展示用）
   * - individual  个人主体  30 元/年
   * - enterprise  企业主体  300 元/年
   */
  certificationFee: {
    individual: 30,
    enterprise: 300,
  },
}));
