import { Pool } from 'pg';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL 连接池（Neon）
const pgPool = process.env.DB_TYPE === 'postgres'
  ? new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      idleTimeoutMillis: 30000,
    })
  : null;

// 统一导出数据库连接池
export const dbPool = pgPool as Pool;

// Redis客户端配置（可选）
let redisClient: any = null;
try {
  redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    },
    password: process.env.REDIS_PASSWORD || undefined
  });

  redisClient.on('error', (err: any) => {
    console.warn('⚠️ Redis Client Error（非致命）:', err.message);
  });
} catch (err: any) {
  console.warn('⚠️ Redis 客户端创建失败（将不使用Redis缓存）:', err.message);
}

// 初始化Redis连接（可选）
export const initRedis = async () => {
  if (!redisClient) {
    console.log('⚠️ 未配置Redis，跳过缓存初始化');
    return;
  }
  try {
    await redisClient.connect();
    console.log('✅ Redis连接成功');
  } catch (error: any) {
    console.warn('⚠️ Redis连接失败（将继续运行，但不使用缓存）:', error.message);
  }
};

// 测试数据库连接
export const testDatabaseConnection = async () => {
  if (!pgPool) {
    console.error('❌ 未配置数据库连接');
    return false;
  }
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ PostgreSQL数据库连接成功');
    return true;
  } catch (error: any) {
    console.error('❌ PostgreSQL数据库连接失败:', error.message);
    return false;
  }
};
