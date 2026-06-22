/**
 * 执行后台管理表创建SQL
 * 使用方法：node execute-admin-tables.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 读取SQL文件
const sqlFilePath = path.join(__dirname, '..', 'sql', 'admin_tables_postgres.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function createAdminTables() {
  // 创建数据库连接池
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔗 连接数据库...');
    await pool.connect();
    console.log('✅ 数据库连接成功');

    console.log('📝 开始执行SQL文件...');
    console.log('文件路径：', sqlFilePath);

    // 执行SQL
    await pool.query(sqlContent);

    console.log('✅ 后台管理表创建成功！');
    console.log('创建的表包括：');
    console.log('  - beast_config（野兽潮配置表）');
    console.log('  - gold_config（金币规则配置表）');
    console.log('  - operation_logs（操作日志表）');
    console.log('  - sensitive_words（敏感词库表）');
    console.log('  - user_violations（用户违规记录表）');
    console.log('  - appeals（申诉工单表）');

  } catch (error) {
    console.error('❌ 执行SQL失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔚 数据库连接已关闭');
  }
}

// 执行
createAdminTables();
