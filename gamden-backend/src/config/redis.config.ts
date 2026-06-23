import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),

  /**
   * 缓存 key 前缀与 TTL
   */
  cache: {
    keyPrefix: 'gamden:cache:',
    ttl: 60 * 5, // 默认 5 分钟
  },

  /**
   * 会话 / refresh token 存储
   */
  session: {
    keyPrefix: 'gamden:session:',
    refreshTokenTtl: 60 * 60 * 24 * 14, // 14 天（与 JWT_REFRESH_TTL 对齐）
  },
}));
