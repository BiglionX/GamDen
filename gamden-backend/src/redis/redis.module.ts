import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 全局 Redis 客户端 token
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * 封装常用 Redis 操作（get/set/del/expire/incr）
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get raw(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (ttlSec) {
      await this.client.set(key, value, 'EX', ttlSec);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }

  /**
   * GETDEL（原子地获取并删除）
   */
  async getDel(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis client closed');
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>('redis.host', 'localhost');
        const port = config.get<number>('redis.port', 6379);
        const password = config.get<string>('redis.password') || undefined;
        const db = config.get<number>('redis.db', 0);
        return new Redis({
          host,
          port,
          password,
          db,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
