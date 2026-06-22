import mysql from 'mysql2/promise';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// MySQL连接池配置
export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamden',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
  waitForConnections: true,
  charset: 'utf8mb4'
});

// Redis客户端配置
export const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD || undefined
});

// Redis连接错误处理
redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// 初始化Redis连接
export const initRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis连接成功');
  } catch (error) {
    console.error('❌ Redis连接失败:', error);
  }
};

// 测试数据库连接
export const testDatabaseConnection = async () => {
  try {
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error);
    return false;
  }
};
