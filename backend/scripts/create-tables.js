// 直接用 Node.js 连接 Neon 并创建所有表
// 使用方法：node backend/scripts/create-tables.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function createAllTables() {
  const client = await pool.connect();
  try {
    console.log('🔗 已连接到 Neon，开始创建表...\n');

    // ===== 1. users 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nickname VARCHAR(50) NOT NULL DEFAULT '',
        avatar VARCHAR(255) DEFAULT '',
        guardian_type VARCHAR(20) NOT NULL CHECK (guardian_type IN ('mechanic','elf','astrologer')),
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        invite_code VARCHAR(10) UNIQUE NOT NULL,
        invited_by BIGINT,
        territory_coord_x INTEGER NOT NULL,
        territory_coord_y INTEGER NOT NULL,
        signature VARCHAR(20) DEFAULT '',
        gold_coins INTEGER DEFAULT 100,
        role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player','vip','club_admin','operator','super_admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','frozen','deleted')),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(territory_coord_x, territory_coord_y)
      );
    `);
    console.log('✅ users 表就绪');

    // ===== 2. invite_records 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS invite_records (
        id BIGSERIAL PRIMARY KEY,
        inviter_id BIGINT NOT NULL,
        invitee_id BIGINT UNIQUE NOT NULL,
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT FALSE,
        mini_program_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ invite_records 表就绪');

    // ===== 3. territory_evolution 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS territory_evolution (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        level INTEGER NOT NULL,
        icon_url VARCHAR(255) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ territory_evolution 表就绪');

    // ===== 4. clubs 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        game_name VARCHAR(50) NOT NULL,
        description VARCHAR(500),
        owner_id BIGINT NOT NULL,
        openim_group_id VARCHAR(100) DEFAULT '',
        member_count INTEGER DEFAULT 1,
        post_count INTEGER DEFAULT 0,
        last_active_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ clubs 表就绪');

    // ===== 5. club_posts 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_posts (
        id BIGSERIAL PRIMARY KEY,
        club_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        content VARCHAR(500) NOT NULL,
        like_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ club_posts 表就绪');

    // ===== 6. post_replies 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_replies (
        id BIGSERIAL PRIMARY KEY,
        post_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        content VARCHAR(200) NOT NULL,
        like_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ post_replies 表就绪');

    // ===== 7. agent_dialogues 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_dialogues (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('mechanic','elf','astrologer')),
        trigger_event VARCHAR(50) NOT NULL,
        response_text TEXT NOT NULL,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ agent_dialogues 表就绪');

    // ===== 8. mini_programs 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS mini_programs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT UNIQUE NOT NULL,
        qr_code_url VARCHAR(255) NOT NULL,
        page_path VARCHAR(255) NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ mini_programs 表就绪');

    // ===== 9. beast_events 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS beast_events (
        id BIGSERIAL PRIMARY KEY,
        event_level INTEGER NOT NULL,
        coord_x INTEGER NOT NULL,
        coord_y INTEGER NOT NULL,
        affected_users JSON,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','resolved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );
    `);
    console.log('✅ beast_events 表就绪');

    // ===== 10. sign_in_records 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS sign_in_records (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        sign_date DATE NOT NULL,
        continuous_days INTEGER DEFAULT 1,
        reward_gold INTEGER DEFAULT 10,
        reward_exp INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sign_in_records 表就绪');

    // ===== 11. gold_transactions 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS gold_transactions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn','spend')),
        amount INTEGER NOT NULL,
        source VARCHAR(50) NOT NULL,
        balance_after INTEGER NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ gold_transactions 表就绪');

    // ===== 12. content_audit_logs 表 =====
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('signature','post','reply')),
        content_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        ai_result VARCHAR(20) CHECK (ai_result IN ('pass','review','block')),
        ai_confidence DECIMAL(5,2),
        manual_result VARCHAR(20) CHECK (manual_result IN ('approved','rejected')),
        auditor_id BIGINT,
        audit_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ content_audit_logs 表就绪');

    // ===== 添加外键约束 =====
    try { await client.query(`ALTER TABLE users ADD CONSTRAINT fk_users_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL`); } catch(e) {}
    try { await client.query(`ALTER TABLE invite_records ADD CONSTRAINT fk_invite_records_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE invite_records ADD CONSTRAINT fk_invite_records_invitee FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE territory_evolution ADD CONSTRAINT fk_territory_evolution_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE clubs ADD CONSTRAINT fk_clubs_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE club_posts ADD CONSTRAINT fk_club_posts_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE club_posts ADD CONSTRAINT fk_club_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE post_replies ADD CONSTRAINT fk_post_replies_post FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE post_replies ADD CONSTRAINT fk_post_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE agent_dialogues ADD CONSTRAINT fk_agent_dialogues_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE mini_programs ADD CONSTRAINT fk_mini_programs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE sign_in_records ADD CONSTRAINT fk_sign_in_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE gold_transactions ADD CONSTRAINT fk_gold_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    try { await client.query(`ALTER TABLE content_audit_logs ADD CONSTRAINT fk_content_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`); } catch(e) {}
    console.log('\n✅ 外键约束就绪');

    // ===== 插入 agent_templates 初始数据 =====
    await client.query(`
      INSERT INTO agent_templates (agent_type, trigger_event, template_text) VALUES
        ('mechanic', 'welcome', '检测到新信号。欢迎归巢，编号{user_id}。'),
        ('mechanic', 'sign_in_remind', '今日补给未领取，建议执行。'),
        ('mechanic', 'invite_success', '新坐标已校准，盟友已就位。'),
        ('mechanic', 'level_up', '系统升级完成。你现在更强了。'),
        ('elf', 'welcome', '呜~森林在颤动。你终于来了。'),
        ('elf', 'sign_in_remind', '太阳晒到树梢了，该浇水啦~'),
        ('elf', 'invite_success', '新芽破土了！你的盟友就在旁边。'),
        ('elf', 'level_up', '古树长高了。你正在变得强大。'),
        ('astrologer', 'welcome', '星辰轨迹中，我看到了你的到来。'),
        ('astrologer', 'sign_in_remind', '星盘显示，今日宜签到。'),
        ('astrologer', 'invite_success', '命运之线已连接，盟友就在你身旁。'),
        ('astrologer', 'level_up', '星力涌动。你的境界突破了。')
      ON CONFLICT (agent_type, trigger_event) DO NOTHING;
    `);
    console.log('✅ agent_templates 初始数据就绪');

    console.log('\n🎉 所有表创建完成！');
    
    // 验证表数量
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log(`\n共创建 ${result.rows.length} 张表：`);
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));

  } catch (error) {
    console.error('\n❌ 创建表失败：', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAllTables().catch(() => process.exit(1));
