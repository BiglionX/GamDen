import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { auditText, processAuditResult } from './contentAuditService';
import { triggerLevelUp } from './agentService';
import { getInviteProgress } from './inviteService';
import { addExp, updateConsecutiveDays } from './agentUpgradeService';

export interface TerritoryInfo {
  user_id: number;
  level: number;
  exp: number;
  next_level_exp: number;
  territory_coord_x: number;
  territory_coord_y: number;
  icon_url: string;
  guardian_type: string;
  gold_coins: number;
  signature: string;
}

export interface NeighborInfo {
  user_id: number;
  territory_coord_x: number;
  territory_coord_y: number;
  level: number;
  signature: string;
  guardian_type: string;
  nickname: string;
  avatar: string;
}

// 等级经验阈值
const LEVEL_EXP_THRESHOLDS = [0, 100, 300, 600, 1000];

// 领地元素图URL（根据守护灵类型和等级）
const TERRITORY_ICONS: { [key: string]: string[] } = {
  mechanic: [
    'https://gamden.com/icons/mechanic/lv1.png', // ⚙️齿轮
    'https://gamden.com/icons/mechanic/lv2.png', // 🔧铁砧
    'https://gamden.com/icons/mechanic/lv3.png', // ⛏️铁匠铺
    'https://gamden.com/icons/mechanic/lv4.png', // 🔥锻炉
    'https://gamden.com/icons/mechanic/lv5.png'  // ⚒️铸造厂
  ],
  elf: [
    'https://gamden.com/icons/elf/lv1.png', // 🌱树苗
    'https://gamden.com/icons/elf/lv2.png', // 🌿小树林
    'https://gamden.com/icons/elf/lv3.png', // 🏡木屋
    'https://gamden.com/icons/elf/lv4.png', // 🏘️石屋群
    'https://gamden.com/icons/elf/lv5.png'  // 🏯小型寨落
  ],
  astrologer: [
    'https://gamden.com/icons/astrologer/lv1.png', // 🔮星尘
    'https://gamden.com/icons/astrologer/lv2.png', // ✨星辉
    'https://gamden.com/icons/astrologer/lv3.png', // 🔭观星台
    'https://gamden.com/icons/astrologer/lv4.png', // 🌌星门
    'https://gamden.com/icons/astrologer/lv5.png'  // 🌀星阵
  ]
};

/**
 * 获取领地详情
 */
export const getTerritoryInfo = async (userId: number): Promise<TerritoryInfo> => {
  const result: any = await dbPool.query(
    `SELECT 
      id as user_id, level, exp, territory_coord_x, territory_coord_y,
      guardian_type, gold_coins, signature
    FROM users WHERE id = $1 AND status = 'active'`,
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在或已注销');
  }
  
  const user = rows[0];
  const nextLevelExp = LEVEL_EXP_THRESHOLDS[user.level] || LEVEL_EXP_THRESHOLDS[4];
  const iconUrl = TERRITORY_ICONS[user.guardian_type][user.level - 1];
  
  return {
    user_id: user.id,
    level: user.level,
    exp: user.exp,
    next_level_exp: nextLevelExp,
    territory_coord_x: user.territory_coord_x,
    territory_coord_y: user.territory_coord_y,
    icon_url: iconUrl,
    guardian_type: user.guardian_type,
    gold_coins: user.gold_coins,
    signature: user.signature
  };
};

/**
 * 查看周围邻居
 */
export const getNearbyNeighbors = async (
  userId: number,
  range: number = 10
): Promise<{ neighbors: NeighborInfo[]; total: number }> => {
  // 获取当前用户坐标
  const userResult: any = await dbPool.query(
    'SELECT territory_coord_x, territory_coord_y FROM users WHERE id = $1',
    [userId]
  );
  
  const userRows = userResult.rows;
  if (userRows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const { territory_coord_x, territory_coord_y } = userRows[0];
  
  // 查询范围内的邻居
  const result: any = await dbPool.query(
    `SELECT 
      id, nickname, avatar, level, signature, guardian_type,
      territory_coord_x, territory_coord_y
    FROM users
    WHERE 
      id != $1 
      AND status = 'active'
      AND territory_coord_x BETWEEN $2 AND $3
      AND territory_coord_y BETWEEN $4 AND $5
    LIMIT 100`,
    [
      userId,
      territory_coord_x - range,
      territory_coord_x + range,
      territory_coord_y - range,
      territory_coord_y + range
    ]
  );
  
  const rows = result.rows;
  const neighbors: NeighborInfo[] = rows.map((row: any) => ({
    user_id: row.id,
    territory_coord_x: row.territory_coord_x,
    territory_coord_y: row.territory_coord_y,
    level: row.level,
    signature: row.signature,
    guardian_type: row.guardian_type,
    nickname: row.nickname,
    avatar: row.avatar
  }));
  
  return {
    neighbors,
    total: neighbors.length
  };
};

/**
 * 添加经验值
 */
export const addExperience = async (
  userId: number,
  exp: number,
  source: string
): Promise<{ level_up: boolean; new_level: number }> => {
  // 获取当前等级和经验
  const result: any = await dbPool.query(
    'SELECT level, exp, guardian_type, created_at FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = rows[0];
  let newExp = user.exp + exp;
  let newLevel = user.level;
  let levelUp = false;

  // 检查是否升级（含等级解锁条件校验）
  while (newLevel < 5 && newExp >= LEVEL_EXP_THRESHOLDS[newLevel]) {
    const nextLevel = newLevel + 1;

    // 校验等级解锁条件
    if (nextLevel === 3) {
      // Lv.3 需邀请1人
      const progress = await getInviteProgress(userId);
      if (progress.invited_count < 1) {
        logger.info('经验已达标但邀请人数不足，无法升至Lv.3', { userId, invitedCount: progress.invited_count });
        break;
      }
    } else if (nextLevel === 4) {
      // Lv.4 需邀请3人
      const progress = await getInviteProgress(userId);
      if (progress.invited_count < 3) {
        logger.info('经验已达标但邀请人数不足，无法升至Lv.4', { userId, invitedCount: progress.invited_count });
        break;
      }
    } else if (nextLevel === 5) {
      // Lv.5 需活跃14天+邀请5人
      const progress = await getInviteProgress(userId);
      const daysSinceRegister = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (progress.invited_count < 5 || daysSinceRegister < 14) {
        logger.info('经验已达标但不满足Lv.5条件', { userId, invitedCount: progress.invited_count, daysSinceRegister });
        break;
      }
    }

    newLevel = nextLevel;
    levelUp = true;
  }
  
  // 更新数据库
  await dbPool.query(
    'UPDATE users SET level = $1, exp = $2 WHERE id = $3',
    [newLevel, newExp, userId]
  );
  
  // 如果升级，记录领地演进
  if (levelUp) {
    const iconUrl = TERRITORY_ICONS[user.guardian_type || 'mechanic'][newLevel - 1];
    await dbPool.query(
      'INSERT INTO territory_evolution (user_id, level, icon_url) VALUES ($1, $2, $3)',
      [userId, newLevel, iconUrl]
    );

    // 触发Agent领地等级提升通知（异步）
    setImmediate(async () => {
      try {
        await triggerLevelUp(userId);
      } catch (err: any) {
        logger.error('发送Agent等级提升通知失败', { userId, error: err.message });
      }
    });

    logger.info('用户升级', { userId, newLevel, source });
  }

  // 同时触发守护灵升级系统的领地升级经验值（异步，不阻塞主流程）
  setImmediate(async () => {
    try {
      await addExp(userId, 'territory');
      await updateConsecutiveDays(userId);
    } catch (err: any) {
      logger.error('守护灵领地升级EXP添加失败', { userId, error: err.message });
    }
  });
  
  return {
    level_up: levelUp,
    new_level: newLevel
  };
};

/**
 * 更新签名
 */
export const updateSignature = async (
  userId: number,
  signature: string
): Promise<void> => {
  if (signature.length > 20) {
    throw new Error('签名长度不能超过20字');
  }
  
  // AI内容审核（签名审核规则：置信度>90%直接通过，≤90%进入人工复审）
  try {
    const auditResult = await auditText(signature);
    const processResult = processAuditResult(auditResult, 'signature', userId, userId);
    
    if (processResult.action === 'block') {
      throw new Error(`签名包含敏感词：${processResult.reason}`);
    } else if (processResult.action === 'review') {
      console.log(`签名进入人工复审：${signature}`);
      // 签名审核不通过时，不更新数据库，直接返回错误
      // 如果进入复审，可以先保存，状态为pending
      // 根据业务需求，签名可以选择直接通过或进入复审
    }
  } catch (error: any) {
    if (error.message.includes('敏感词')) {
      throw error;
    }
    console.warn('AI审核失败，将正常保存:', error.message);
  }
  
  await dbPool.query(
    'UPDATE users SET signature = $1 WHERE id = $2',
    [signature, userId]
  );
  
  logger.info('签名更新', { userId, signature });
};
