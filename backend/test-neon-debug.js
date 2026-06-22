// 调试Neon密码问题
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DB_URL;
console.log('=== 环境变量检查 ===');
console.log('DB_URL存在:', !!connectionString);
console.log('DB_URL前缀:', connectionString ? connectionString.substring(0, 80) + '...' : '未设置');

// 解析连接字符串中的密码
if (connectionString) {
  try {
    const url = new URL(connectionString);
    console.log('\n=== URL解析结果 ===');
    console.log('host:', url.host);
    console.log('user:', url.username);
    console.log('password长度:', url.password.length);
    console.log('password字符:', JSON.stringify(url.password));
    console.log('database:', url.pathname.replace('/', ''));
    console.log('sslmode:', url.searchParams.get('sslmode'));
  } catch (e) {
    console.error('URL解析失败:', e.message);
  }
}

// 同时也测试分开的配置
console.log('\n=== 分开配置检查 ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD存在:', !!process.env.DB_PASSWORD);
console.log('DB_PASSWORD长度:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('DB_NAME:', process.env.DB_NAME);
