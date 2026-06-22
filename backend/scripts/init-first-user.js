/**
 * 初始化第一个用户（管理员）
 * 用于生成邀请码，让其他用户可以注册
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function initFirstUser() {
  try {
    console.log('开始初始化第一个用户...\n');

    // 检查是否已有用户
    const existingResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(existingResult.rows[0].count);

    if (userCount > 0) {
      console.log(`数据库中已有 ${userCount} 个用户，无需初始化。`);
      console.log('现有的邀请码：');
      
      const inviteCodes = await pool.query('SELECT invite_code FROM users WHERE invite_code IS NOT NULL LIMIT 10');
      inviteCodes.rows.forEach(row => {
        console.log(`  - ${row.invite_code}`);
      });
      
      process.exit(0);
    }

    // 创建第一个管理员用户
    const phone = '10000000000'; // 管理员手机号
    const password = 'Admin123456';
    const nickname = '管理员';
    const guardianType = 'mechanic';
    const inviteCode = 'ADMIN1'; // 固定的管理员邀请码

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 插入用户
    const result = await pool.query(
      `INSERT INTO users (
        phone, password_hash, nickname, guardian_type, 
        invite_code, level, exp, gold_coins, role, status,
        territory_coord_x, territory_coord_y
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        phone,
        passwordHash,
        nickname,
        guardianType,
        inviteCode,
        5, // 最高等级
        1000, // 满经验
        99999, // 满金币
        'super_admin', // 超级管理员角色
        'active',
        0, // 中心坐标
        0
      ]
    );

    const userId = result.rows[0].id;

    console.log('✅ 第一个用户创建成功！\n');
    console.log('用户信息：');
    console.log(`  用户ID: ${userId}`);
    console.log(`  手机号: ${phone}`);
    console.log(`  密码: ${password}`);
    console.log(`  昵称: ${nickname}`);
    console.log(`  邀请码: ${inviteCode}`);
    console.log('\n你可以使用此邀请码注册新用户：');
    console.log(`  invite_code: ${inviteCode}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initFirstUser();
