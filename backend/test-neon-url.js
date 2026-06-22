// 直接用连接字符串测试Neon连接
require('dotenv').config();
const { Pool } = require('pg');

// 从.env读取连接字符串
const connectionString = process.env.DB_URL;

if (!connectionString) {
  console.error('❌ 未找到 DB_URL，请在.env中配置');
  process.exit(1);
}

console.log('🔄 正在连接Neon PostgreSQL...');
console.log('连接字符串前缀:', connectionString.substring(0, 60) + '...');

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function test() {
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
      console.log('   请按以下步骤导入Schema：');
      console.log('   1. 登录 https://console.neon.tech/');
      console.log('   2. 打开 SQL Editor');
      console.log('   3. 复制 backend/sql/schema_postgres.sql 的内容');
      console.log('   4. 粘贴并执行\n');
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
    console.error('\n请检查：');
    console.error('  1. .env 文件中的 DB_URL 是否正确');
    console.error('  2. Neon 项目是否处于活跃状态（非休眠）');
    console.error('  3. 网络连接是否正常\n');
    console.error('完整错误：', error);
    process.exit(1);
  }
}

test();
