import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

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
  const [rows]: any = await dbPool.execute(
    `SELECT 
      id as user_id, level, exp, territory_coord_x, territory_coord_y,
      guardian_type, gold_coins, signature
    FROM users WHERE id = ? AND status = 'active'`,
    [userId]
  );
  
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
  const [userRows]: any = await dbPool.execute(
    'SELECT territory_coord_x, territory_coord_y FROM users WHERE id = ?',
    [userId]
  );
  
  if (userRows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const { territory_coord_x, territory_coord_y } = userRows[0];
  
  // 查询范围内的邻居
  const [rows]: any = await dbPool.execute(
    `SELECT 
      id, nickname, avatar, level, signature, guardian_type,
      territory_coord_x, territory_coord_y
    FROM users
    WHERE 
      id != ? 
      AND status = 'active'
      AND territory_coord_x BETWEEN ? AND ?
      AND territory_coord_y BETWEEN ? AND ?
    LIMIT 100`,
    [
      userId,
      territory_coord_x - range,
      territory_coord_x + range,
      territory_coord_y - range,
      territory_coord_y + range
    ]
  );
  
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
  const [rows]: any = await dbPool.execute(
    'SELECT level, exp FROM users WHERE id = ?',
    [userId]
  );
  
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = rows[0];
  let newExp = user.exp + exp;
  let newLevel = user.level;
  let levelUp = false;
  
  // 检查是否升级
  while (newLevel < 5 && newExp >= LEVEL_EXP_THRESHOLDS[newLevel]) {
    newLevel++;
    levelUp = true;
  }
  
  // 更新数据库
  await dbPool.execute(
    'UPDATE users SET level = ?, exp = ? WHERE id = ?',
    [newLevel, newExp, userId]
  );
  
  // 如果升级，记录领地演进
  if (levelUp) {
    const iconUrl = TERRITORY_ICONS[user.guardian_type || 'mechanic'][newLevel - 1];
    await dbPool.execute(
      'INSERT INTO territory_evolution (user_id, level, icon_url) VALUES (?, ?, ?)',
      [userId, newLevel, iconUrl]
    );
    
    logger.info('用户升级', { userId, newLevel, source });
  }
  
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
  
  await dbPool.execute(
    'UPDATE users SET signature = ? WHERE id = ?',
    [signature, userId]
  );
  
  logger.info('签名更新', { userId, signature });
};
