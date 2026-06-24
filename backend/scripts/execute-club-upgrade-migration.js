// 俱乐部升级系统迁移脚本 V2
// 使用方法：node backend/scripts/execute-club-upgrade-migration.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1
});

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 已连接到 Neon PostgreSQL');
    console.log('📦 开始执行俱乐部升级系统迁移...\n');

    // ============================================
    // 1. 扩展 clubs 表
    // ============================================
    console.log('📝 步骤1: 扩展 clubs 表字段');
    
    const alterStatements = [
      // 添加 club_type
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS club_type VARCHAR(20) DEFAULT 'game' CHECK (club_type IN ('default', 'interest', 'game', 'custom'))`,
      // 添加 tags
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`,
      // 添加 join_type
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS join_type VARCHAR(20) DEFAULT 'free' CHECK (join_type IN ('auto', 'free', 'approval'))`,
      // 添加 vitality
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality INTEGER DEFAULT 0`,
      // 添加 vitality_level
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality_level VARCHAR(20) DEFAULT 'bronze' CHECK (vitality_level IN ('bronze', 'silver', 'gold', 'diamond'))`,
      // 添加 vitality_updated_at
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS vitality_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      // 添加 game_name_ext
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS game_name_ext VARCHAR(50)`,
      // 添加 icon
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '🏠'`,
      // 添加 endorsement_count
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS endorsement_count INTEGER DEFAULT 0`,
      // 添加 endorsement_deadline
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS endorsement_deadline TIMESTAMP`
    ];

    for (const stmt of alterStatements) {
      try {
        await client.query(stmt);
        const colMatch = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
        if (colMatch) {
          console.log(`  ✅ 添加字段: ${colMatch[1]}`);
        }
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log(`  ⚠️  ${colMatch?.[1] || '字段'}: ${err.message}`);
        }
      }
    }

    // ============================================
    // 2. 创建 club_members 表
    // ============================================
    console.log('\n📝 步骤2: 创建 club_members 表');
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_members (
        id BIGSERIAL PRIMARY KEY,
        club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, user_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_members_role ON club_members(role)`);
    console.log('  ✅ club_members 表已创建');

    // ============================================
    // 3. 创建 club_proposals 表
    // ============================================
    console.log('\n📝 步骤3: 创建 club_proposals 表');
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_proposals (
        id BIGSERIAL PRIMARY KEY,
        proposer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        description VARCHAR(200) NOT NULL,
        proposal_type VARCHAR(20) DEFAULT 'other' CHECK (proposal_type IN ('game', 'interest', 'other')),
        game_name VARCHAR(50),
        tags TEXT[] DEFAULT '{}',
        endorsement_count INTEGER DEFAULT 0,
        endorsement_deadline TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
        reviewed_by BIGINT REFERENCES users(id),
        review_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_proposals_proposer_id ON club_proposals(proposer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_proposals_status ON club_proposals(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_proposals_created_at ON club_proposals(created_at DESC)`);
    console.log('  ✅ club_proposals 表已创建');

    // ============================================
    // 4. 创建 club_endorsements 表
    // ============================================
    console.log('\n📝 步骤4: 创建 club_endorsements 表');
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_endorsements (
        id BIGSERIAL PRIMARY KEY,
        proposal_id BIGINT NOT NULL REFERENCES club_proposals(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(proposal_id, user_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_endorsements_proposal_id ON club_endorsements(proposal_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_endorsements_user_id ON club_endorsements(user_id)`);
    console.log('  ✅ club_endorsements 表已创建');

    // ============================================
    // 5. 创建 club_vitality_logs 表
    // ============================================
    console.log('\n📝 步骤5: 创建 club_vitality_logs 表');
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_vitality_logs (
        id BIGSERIAL PRIMARY KEY,
        club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        delta INTEGER NOT NULL,
        source VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_vitality_logs_club_id ON club_vitality_logs(club_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_club_vitality_logs_created_at ON club_vitality_logs(created_at DESC)`);
    console.log('  ✅ club_vitality_logs 表已创建');

    // 6. 插入俱乐部数据
    // ============================================
    console.log('\n📝 步骤6: 插入俱乐部数据');

    // 先为 clubs 表添加 name 唯一约束（如果不存在）
    try {
      await client.query(`ALTER TABLE clubs ADD CONSTRAINT clubs_name_key UNIQUE (name)`);
      console.log('  ✅ clubs.name 唯一约束已添加');
    } catch (e) {
      if (e.code !== '42710') { /* 忽略已存在错误 */ }
    }

    // 获取 super_admin 的 ID
    const adminResult = await client.query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
    const adminId = adminResult.rows[0]?.id;
    
    if (!adminId) {
      console.log('  ⚠️ 未找到 super_admin 用户，跳过插入');
    } else {
      console.log(`  📌 使用 admin ID: ${adminId}`);

      // 6.1 默认俱乐部
      await client.query(`
        INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
        VALUES ('闲云茶馆', '闲聊', '南来北往的客官，进来喝杯茶再走。所有玩家自动加入。', $1, 'default', 'auto', ARRAY['闲聊', '交友'], 100, 'bronze', '🍵', '闲聊', 'active')
        ON CONFLICT (name) DO NOTHING
      `, [adminId]);
      console.log('  ✅ 插入: 闲云茶馆 (默认)');

      // 6.2 兴趣俱乐部
      const interestClubs = [
        { name: '演武场', game: '竞技', desc: '喜欢PVP、竞技、天梯排名的玩家聚集地', icon: '⚔️', tags: ['pvp', '竞技', '对战'], ext: '竞技' },
        { name: '农耕社', game: '休闲', desc: '喜欢种田、收集、养成、轻松玩法的玩家聚集地', icon: '🌾', tags: ['休闲', '收集', '种田'], ext: '休闲' },
        { name: '工匠坊', game: '建造', desc: '喜欢建造、经营、策略规划的玩家聚集地', icon: '🏗️', tags: ['建造', '经营', '策略'], ext: '建造' },
        { name: '戏台', game: '剧情', desc: '喜欢剧情、角色扮演、二次元的玩家聚集地', icon: '🎭', tags: ['剧情', 'RPG', '二次元'], ext: '剧情' },
        { name: '画师阁', game: '创作', desc: '喜欢分享截图、创作、美术的玩家聚集地', icon: '📷', tags: ['创作', '截图', '美术'], ext: '创作' },
        { name: '酒馆', game: '社交', desc: '喜欢聊天吹水、交友的玩家聚集地', icon: '🎙️', tags: ['社交', '聊天', '交友'], ext: '社交' },
        { name: '维修铺', game: '技术', desc: '数码爱好者、硬件玩家聚集地', icon: '🔧', tags: ['数码', '硬件', '技术'], ext: '技术' }
      ];

      for (const club of interestClubs) {
        await client.query(`
          INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
          VALUES ($1, $2, $3, $4, 'interest', 'free', $5, 50, 'bronze', $6, $7, 'active')
          ON CONFLICT (name) DO NOTHING
        `, [club.name, club.game, club.desc, adminId, club.tags, club.icon, club.ext]);
        console.log(`  ✅ 插入: ${club.name} (兴趣)`);
      }

      // 6.3 游戏俱乐部
      const gameClubs = [
        { name: '《原神》茶摊', game: '原神', desc: '聊原神的一切', icon: '🏯', tags: ['开放世界', '角色扮演', '二次元'], ext: '原神' },
        { name: '《王者荣耀》茶摊', game: '王者荣耀', desc: '王者荣耀玩家聚集地', icon: '👑', tags: ['MOBA', '竞技', '手游'], ext: '王者荣耀' },
        { name: '《金铲铲》茶摊', game: '金铲铲', desc: '金铲铲之战玩家聚集地', icon: '🪄', tags: ['自走棋', '策略', '休闲'], ext: '金铲铲之战' },
        { name: '《星穹铁道》茶摊', game: '星穹铁道', desc: '崩坏星穹铁道玩家聚集地', icon: '🚄', tags: ['回合制', 'RPG', '二次元'], ext: '崩坏：星穹铁道' },
        { name: '《绝区零》茶摊', game: '绝区零', desc: '绝区零玩家聚集地', icon: '⚡', tags: ['动作', 'RPG', '都市'], ext: '绝区零' },
        { name: '《永劫无间》茶摊', game: '永劫无间', desc: '永劫无间玩家聚集地', icon: '⚔️', tags: ['动作', '竞技', '武侠'], ext: '永劫无间' },
        { name: '《蛋仔派对》茶摊', game: '蛋仔派对', desc: '蛋仔派对玩家聚集地', icon: '🥚', tags: ['休闲', '派对', '闯关'], ext: '蛋仔派对' },
        { name: '《和平精英》茶摊', game: '和平精英', desc: '和平精英玩家聚集地', icon: '🎯', tags: ['FPS', '射击', '竞技'], ext: '和平精英' }
      ];

      for (const club of gameClubs) {
        await client.query(`
          INSERT INTO clubs (name, game_name, description, owner_id, club_type, join_type, tags, vitality, vitality_level, icon, game_name_ext, status)
          VALUES ($1, $2, $3, $4, 'game', 'free', $5, 50, 'bronze', $6, $7, 'active')
          ON CONFLICT (name) DO NOTHING
        `, [club.name, club.game, club.desc, adminId, club.tags, club.icon, club.ext]);
        console.log(`  ✅ 插入: ${club.name} (游戏)`);
      }
    }

    // ============================================
    // 7. 创建触发器
    // ============================================
    console.log('\n📝 步骤7: 创建更新触发器');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_club_proposals_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`DROP TRIGGER IF EXISTS update_club_proposals_updated_at ON club_proposals`);
    await client.query(`CREATE TRIGGER update_club_proposals_updated_at BEFORE UPDATE ON club_proposals
      FOR EACH ROW EXECUTE FUNCTION update_club_proposals_updated_at()`);
    console.log('  ✅ 触发器已创建');

    // ============================================
    // 验证结果
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('🔍 验证迁移结果...\n');

    // 检查新表
    const tables = ['club_members', 'club_proposals', 'club_endorsements', 'club_vitality_logs'];
    for (const tableName of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`✅ 表 ${tableName} (${result.rows[0].count} 条记录)`);
      } catch (e) {
        console.log(`❌ 表 ${tableName} 未找到`);
      }
    }

    // 检查俱乐部数量
    const clubCount = await client.query('SELECT COUNT(*) FROM clubs');
    console.log(`\n✅ 俱乐部总数: ${clubCount.rows[0].count}`);

    // 显示俱乐部列表
    const clubs = await client.query(`
      SELECT id, name, club_type, vitality_level, vitality 
      FROM clubs 
      ORDER BY 
        CASE club_type 
          WHEN 'default' THEN 1 
          WHEN 'interest' THEN 2 
          WHEN 'game' THEN 3 
          ELSE 4 
        END, name
    `);
    console.log('\n📋 俱乐部列表:');
    clubs.rows.forEach(club => {
      console.log(`   ${club.id.toString().padStart(2)}. ${club.name.padEnd(15)} [${club.club_type.padEnd(8)}] ${club.vitality_level.padEnd(6)} ${club.vitality}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎉 俱乐部升级系统迁移完成!');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration()
  .then(() => {
    console.log('\n✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败');
    process.exit(1);
  });
