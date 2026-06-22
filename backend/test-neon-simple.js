// 最简单的Neon连接测试脚本
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function test() {
  console.log('🔄 正在连接Neon...\n');
  console.log('连接参数：');
  console.log('  host:', process.env.DB_HOST);
  console.log('  port:', process.env.DB_PORT);
  console.log('  user:', process.env.DB_USER);
  console.log('  database:', process.env.DB_NAME);
  console.log('  password长度:', process.env.DB_PASSWORD?.length, '\n');

  try {
    const client = await pool.connect();
    console.log('✅ 连接成功！\n');

    // 检查现有表
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  数据库中没有表。');
      console.log('请执行：');
      console.log('  1. 登录 https://console.neon.tech/');
      console.log('  2. 打开 SQL Editor');
      console.log('  3. 复制 backend/sql/schema_postgres.sql 的内容');
      console.log('  4. 粘贴并执行\n');
    } else {
      console.log('✅ 已创建的表：');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log(`\n   共 ${result.rows.length} 张表\n`);
    }

    client.release();
    await pool.end();
    
    console.log('🎉 数据库连接测试完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 连接失败！\n');
    console.error('错误信息：', error.message);
    console.error('\n完整错误：', error);
    process.exit(1);
  }
}

test();
