/**
 * 守护灵升级系统核心服务
 * 
 * 功能：
 * - 经验值（EXP）管理：添加EXP、检查升级、触发升级消息
 * - 亲密度（Bond）管理：添加Bond、检查升阶、触发升阶消息
 * - 彩蛋系统：检查并触发彩蛋
 * - 主动关心：连续未登录、连续登录等场景触发关心消息
 * - 性格演化：根据行为生成性格标签
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { getAgentResponse, sendAgentMessage } from './agentService';

// ======================== 常量定义 ========================

/** 守护灵等级经验阈值（共10级） */
export const AGENT_LEVEL_THRESHOLDS = [0, 50, 120, 220, 350, 520, 740, 1020, 1380, 1800];

/** 亲密度阈值（共5阶） */
export const AGENT_BOND_THRESHOLDS = [0, 100, 250, 500, 800];

/** 每日EXP上限 */
export const DAILY_EXP_LIMITS = {
  sign_in: 10,    // 签到
  post: 20,       // 发帖/回帖（每次+5，4次/日）
  like: 10,       // 被点赞（每次+2，5次/日）
  invite: 150,    // 邀请（每次+50，3人/日）
  territory: Infinity, // 领地升级（不限）
  market: 6,      // 浏览集市（每次+2，3次/日）
  consecutive: Infinity // 连续登录（不限）
};

/** EXP获取规则 */
export const EXP_RULES: Record<ExpType, number> = {
  sign_in: 10,
  post: 5,
  like: 2,
  invite: 50,
  territory: 30,
  market: 2,
  consecutive: 0
};

/** Bond获取规则 */
export const BOND_RULES: Record<BondType, number> = {
  dialogue: 5,        // 对话
  task: 10,           // 完成守护灵任务
  consecutive: 15,    // 连续登录7天（触发1次）
  invite: 20,         // 邀请好友
  level_up: 0         // 升级触发，不计分
};

/** Bond每日上限 */
export const DAILY_BOND_LIMITS = {
  dialogue: 20,        // 对话（4次/日）
  task: 10,           // 任务（1次/日）
  consecutive: 15,     // 连续登录（7天1次）
  invite: 60          // 邀请（3人/日）
};

// ======================== 类型定义 ========================

export interface AgentStateData {
  user_id: number;
  agent_level: number;
  exp: number;
  bond_level: number;
  bond_points: number;
  personality_tags: string[];
  unlocked_eggs: string[];
  consecutive_days: number;
  first_active_at: string | null;
  last_active_at: string | null;
  last_level_up_at: string | null;
}

export interface DailyProgressData {
  action_date: string;
  sign_in_count: number;
  post_count: number;
  like_count: number;
  invite_count: number;
  territory_count: number;
  market_count: number;
  exp_gained: number;
  bond_gained: number;
  exp_remaining: number;    // 今日剩余EXP额度
  bond_remaining: number;  // 今日剩余Bond额度
}

export interface ExpResult {
  success: boolean;
  exp_added: number;
  new_exp: number;
  level_up: boolean;
  new_level: number;
  unlocked_eggs?: string[];
  text?: string;
}

export interface BondResult {
  success: boolean;
  bond_added: number;
  new_bond: number;
  bond_up: boolean;
  new_bond_level: number;
  text?: string;
}

export type ExpType = 'sign_in' | 'post' | 'like' | 'invite' | 'territory' | 'market' | 'consecutive';
export type BondType = 'dialogue' | 'task' | 'consecutive' | 'invite' | 'level_up';
export type EggType = 'daily_fortune' | 'device_status' | 'wind_direction' | 'fate_meet' | 'plant' | 'framerate';
export type CareType = 'absence' | 'consecutive' | 'neighbor';

// ======================== 核心功能 ========================

/**
 * 获取守护灵状态
 */
export const getAgentState = async (userId: number): Promise<AgentStateData> => {
  const result: any = await dbPool.query(
    `SELECT 
      user_id, agent_level, exp, bond_level, bond_points,
      personality_tags, unlocked_eggs, consecutive_days,
      first_active_at, last_active_at, last_level_up_at
    FROM agent_state
    WHERE user_id = $1`,
    [userId]
  );

  const rows = result.rows;
  if (rows.length === 0) {
    // 如果没有记录，创建一个新的
    await initAgentState(userId);
    return getAgentState(userId);
  }

  const row = rows[0];
  return {
    user_id: row.user_id,
    agent_level: row.agent_level,
    exp: row.exp,
    bond_level: row.bond_level,
    bond_points: row.bond_points,
    personality_tags: row.personality_tags || [],
    unlocked_eggs: row.unlocked_eggs || [],
    consecutive_days: row.consecutive_days || 0,
    first_active_at: row.first_active_at,
    last_active_at: row.last_active_at,
    last_level_up_at: row.last_level_up_at
  };
};

/**
 * 初始化守护灵状态
 */
export const initAgentState = async (userId: number): Promise<void> => {
  const now = new Date().toISOString();
  await dbPool.query(
    `INSERT INTO agent_state (user_id, agent_level, exp, bond_level, bond_points, first_active_at, last_active_at)
     VALUES ($1, 1, 0, 1, 0, $2, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, now]
  );
};

/**
 * 获取今日进度
 */
export const getDailyProgress = async (userId: number): Promise<DailyProgressData> => {
  const today = new Date().toISOString().slice(0, 10);
  
  const result: any = await dbPool.query(
    `SELECT * FROM agent_daily_exp WHERE user_id = $1 AND action_date = $2`,
    [userId, today]
  );

  const rows = result.rows;
  if (rows.length === 0) {
    // 返回空进度
    return {
      action_date: today,
      sign_in_count: 0,
      post_count: 0,
      like_count: 0,
      invite_count: 0,
      territory_count: 0,
      market_count: 0,
      exp_gained: 0,
      bond_gained: 0,
      exp_remaining: DAILY_EXP_LIMITS.sign_in + DAILY_EXP_LIMITS.post + DAILY_EXP_LIMITS.like + 
                     DAILY_EXP_LIMITS.invite + DAILY_EXP_LIMITS.market,
      bond_remaining: DAILY_BOND_LIMITS.dialogue + DAILY_BOND_LIMITS.invite
    };
  }

  const row = rows[0];
  const expRemaining = (DAILY_EXP_LIMITS.sign_in + DAILY_EXP_LIMITS.post + DAILY_EXP_LIMITS.like + 
                        DAILY_EXP_LIMITS.invite + DAILY_EXP_LIMITS.market) - (row.exp_gained || 0);
  const bondRemaining = (DAILY_BOND_LIMITS.dialogue + DAILY_BOND_LIMITS.invite) - (row.bond_gained || 0);

  return {
    action_date: row.action_date,
    sign_in_count: row.sign_in_count || 0,
    post_count: row.post_count || 0,
    like_count: row.like_count || 0,
    invite_count: row.invite_count || 0,
    territory_count: row.territory_count || 0,
    market_count: row.market_count || 0,
    exp_gained: row.exp_gained || 0,
    bond_gained: row.bond_gained || 0,
    exp_remaining: Math.max(0, expRemaining),
    bond_remaining: Math.max(0, bondRemaining)
  };
};

/**
 * 添加经验值并检查升级
 */
export const addExp = async (
  userId: number,
  expType: ExpType,
  amount?: number
): Promise<ExpResult> => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // 检查每日上限
  const dailyProgress = await getDailyProgress(userId);
  const expAmount = amount || EXP_RULES[expType] || 0;
  
  // 检查该行为是否达到每日上限
  if (isExpDailyLimitReached(expType, dailyProgress)) {
    return {
      success: false,
      exp_added: 0,
      new_exp: 0,
      level_up: false,
      new_level: 0
    };
  }

  // 获取当前状态
  const state = await getAgentState(userId);
  const newExp = state.exp + expAmount;

  // 检查升级
  let levelUp = false;
  let newLevel = state.agent_level;
  let unlockedEggs: string[] = [];

  while (newLevel < 10 && newExp >= AGENT_LEVEL_THRESHOLDS[newLevel]) {
    newLevel++;
    levelUp = true;
    
    // Lv.4解锁彩蛋
    if (newLevel >= 4) {
      const eggs = getEggsForLevel(newLevel, state.agent_level);
      unlockedEggs = [...unlockedEggs, ...eggs];
    }
  }

  // 更新数据库
  await dbPool.query(
    `UPDATE agent_state 
     SET exp = $1, agent_level = $2, last_active_at = $3, updated_at = $4
     WHERE user_id = $5`,
    [newExp, newLevel, now, now, userId]
  );

  // 如果升级，更新最后升级时间
  if (levelUp) {
    await dbPool.query(
      `UPDATE agent_state SET last_level_up_at = $1 WHERE user_id = $2`,
      [now, userId]
    );
  }

  // 更新每日计数
  await updateDailyExp(userId, today, expType, expAmount);

  // 触发升级消息
  let upgradeText: string | undefined;
  if (levelUp) {
    upgradeText = await triggerAgentLevelUp(userId, newLevel);
    
    // 解锁彩蛋
    if (unlockedEggs.length > 0) {
      await unlockEggs(userId, unlockedEggs);
    }
  }

  logger.info('守护灵EXP添加', { userId, expType, expAmount, newExp, levelUp, newLevel });

  return {
    success: true,
    exp_added: expAmount,
    new_exp: newExp,
    level_up: levelUp,
    new_level: newLevel,
    unlocked_eggs: unlockedEggs.length > 0 ? unlockedEggs : undefined,
    text: upgradeText
  };
};

/**
 * 检查EXP类型是否达到每日上限
 */
const isExpDailyLimitReached = (expType: ExpType, progress: DailyProgressData): boolean => {
  const limits: Record<ExpType, number> = {
    sign_in: 1,    // 每日1次签到
    post: 4,       // 每日4次
    like: 5,       // 每日5次
    invite: 3,     // 每日3人
    territory: Infinity,
    market: 3,     // 每日3次
    consecutive: Infinity
  };

  const limit = limits[expType];
  if (limit === Infinity) return false;

  const counts: Record<ExpType, number> = {
    sign_in: progress.sign_in_count,
    post: progress.post_count,
    like: progress.like_count,
    invite: progress.invite_count,
    territory: progress.territory_count,
    market: progress.market_count,
    consecutive: 0
  };

  return counts[expType] >= limit;
};

/**
 * 更新每日EXP计数
 */
const updateDailyExp = async (
  userId: number,
  date: string,
  expType: ExpType,
  expAmount: number
): Promise<void> => {
  const fieldMap: Record<ExpType, string> = {
    sign_in: 'sign_in_count',
    post: 'post_count',
    like: 'like_count',
    invite: 'invite_count',
    territory: 'territory_count',
    market: 'market_count',
    consecutive: 'consecutive_days'
  };

  const field = fieldMap[expType];

  await dbPool.query(
    `INSERT INTO agent_daily_exp (user_id, action_date, ${field}, exp_gained)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (user_id, action_date) 
     DO UPDATE SET ${field} = agent_daily_exp.${field} + 1, exp_gained = agent_daily_exp.exp_gained + $3`,
    [userId, date, expAmount]
  );
};

/**
 * 根据等级获取应解锁的彩蛋
 */
const getEggsForLevel = (newLevel: number, oldLevel: number): string[] => {
  const eggMap: Record<number, string[]> = {
    4: ['daily_fortune', 'device_status', 'wind_direction'],
    8: ['fate_meet']
  };

  const eggs: string[] = [];
  for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
    if (eggMap[lv]) {
      eggs.push(...eggMap[lv]);
    }
  }
  return eggs;
};

/**
 * 解锁彩蛋
 */
export const unlockEggs = async (userId: number, eggs: string[]): Promise<void> => {
  if (eggs.length === 0) return;

  await dbPool.query(
    `UPDATE agent_state 
     SET unlocked_eggs = array_cat(unlocked_eggs, $1::text[]), updated_at = NOW()
     WHERE user_id = $2`,
    [eggs, userId]
  );

  logger.info('守护灵彩蛋解锁', { userId, eggs });
};

/**
 * 触发守护灵升级消息
 */
const triggerAgentLevelUp = async (userId: number, newLevel: number): Promise<string> => {
  const triggerEvent = `agent_lv${newLevel}`;
  const response = await getAgentResponse(userId, triggerEvent);
  await sendAgentMessage(userId, triggerEvent);
  return response;
};

/**
 * 添加亲密度并检查升阶
 */
export const addBond = async (
  userId: number,
  bondType: BondType,
  amount?: number
): Promise<BondResult> => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // 检查每日上限
  const dailyProgress = await getDailyProgress(userId);
  const bondAmount = amount || BOND_RULES[bondType] || 0;

  // 检查该行为是否达到每日上限
  if (isBondDailyLimitReached(bondType, dailyProgress)) {
    return {
      success: false,
      bond_added: 0,
      new_bond: 0,
      bond_up: false,
      new_bond_level: 0
    };
  }

  // 获取当前状态
  const state = await getAgentState(userId);
  const newBond = state.bond_points + bondAmount;

  // 检查升阶
  let bondUp = false;
  let newBondLevel = state.bond_level;

  while (newBondLevel < 5 && newBond >= AGENT_BOND_THRESHOLDS[newBondLevel]) {
    newBondLevel++;
    bondUp = true;
  }

  // 更新数据库
  await dbPool.query(
    `UPDATE agent_state 
     SET bond_points = $1, bond_level = $2, last_active_at = $3, updated_at = $4
     WHERE user_id = $5`,
    [newBond, newBondLevel, now, now, userId]
  );

  // 更新每日计数
  await updateDailyBond(userId, today, bondType, bondAmount);

  // 触发升阶消息
  let bondText: string | undefined;
  if (bondUp) {
    bondText = await triggerAgentBondUp(userId, newBondLevel);
  }

  logger.info('守护灵Bond添加', { userId, bondType, bondAmount, newBond, bondUp, newBondLevel });

  return {
    success: true,
    bond_added: bondAmount,
    new_bond: newBond,
    bond_up: bondUp,
    new_bond_level: newBondLevel,
    text: bondText
  };
};

/**
 * 检查Bond类型是否达到每日上限
 */
const isBondDailyLimitReached = (bondType: BondType, progress: DailyProgressData): boolean => {
  const limits: Record<BondType, number> = {
    dialogue: 4,       // 每日4次对话
    task: 1,           // 每日1次任务
    consecutive: 1,    // 7天1次
    invite: 3,         // 每日3人
    level_up: Infinity  // 升级时触发，不限
  };

  const limit = limits[bondType];
  if (limit === Infinity) return false;

  // 对于invite，使用invite_count；对于dialogue，预估
  if (bondType === 'invite') {
    return progress.invite_count >= limit;
  }

  // dialogue没有单独计数，需要简单限制
  if (bondType === 'dialogue') {
    // 简化处理：dialogue不限制，因为有bond_gained控制
    return false;
  }

  return false;
};

/**
 * 更新每日Bond计数
 */
const updateDailyBond = async (
  userId: number,
  date: string,
  bondType: BondType,
  bondAmount: number
): Promise<void> => {
  if (bondType === 'dialogue') return; // 对话不计入每日计数

  await dbPool.query(
    `INSERT INTO agent_daily_exp (user_id, action_date, bond_gained)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, action_date) 
     DO UPDATE SET bond_gained = agent_daily_exp.bond_gained + $3`,
    [userId, date, bondAmount]
  );
};

/**
 * 触发守护灵升阶消息
 */
const triggerAgentBondUp = async (userId: number, newBondLevel: number): Promise<string> => {
  const triggerEvent = `bond_${newBondLevel}`;
  const response = await getAgentResponse(userId, triggerEvent);
  await sendAgentMessage(userId, triggerEvent);
  return response;
};

/**
 * 检查并触发彩蛋
 */
export const checkAndTriggerEgg = async (
  userId: number,
  eggType: EggType
): Promise<{ triggered: boolean; text?: string }> => {
  const state = await getAgentState(userId);

  // 检查彩蛋是否已解锁
  if (!state.unlocked_eggs.includes(eggType)) {
    // Lv.4前不触发彩蛋
    if (state.agent_level < 4) {
      return { triggered: false };
    }
  }

  // 触发彩蛋话术
  const triggerEvent = `egg_${eggType.replace('_', '')}`;
  try {
    const text = await getAgentResponse(userId, triggerEvent);
    await sendAgentMessage(userId, triggerEvent);
    return { triggered: true, text };
  } catch (error) {
    logger.warn('彩蛋触发失败', { userId, eggType });
    return { triggered: false };
  }
};

/**
 * 检查并触发主动关心
 */
export const checkAndTriggerCare = async (
  userId: number,
  careType: CareType
): Promise<{ triggered: boolean; text?: string }> => {
  const state = await getAgentState(userId);

  // Lv.8前不解锁主动关心
  if (state.agent_level < 8) {
    return { triggered: false };
  }

  // 触发关心话术
  const triggerEvent = `care_${careType}`;
  try {
    const text = await getAgentResponse(userId, triggerEvent);
    await sendAgentMessage(userId, triggerEvent);
    return { triggered: true, text };
  } catch (error) {
    logger.warn('主动关心触发失败', { userId, careType });
    return { triggered: false };
  }
};

/**
 * 更新连续登录天数
 */
export const updateConsecutiveDays = async (userId: number): Promise<number> => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const state = await getAgentState(userId);

  // 检查上次登录时间
  if (state.last_active_at) {
    const lastDate = state.last_active_at.slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastDate === today) {
      // 今天已登录，不更新
      return state.consecutive_days;
    } else if (lastDate === yesterdayStr) {
      // 昨天已登录，连续天数+1
      const newDays = state.consecutive_days + 1;
      await dbPool.query(
        `UPDATE agent_state SET consecutive_days = $1, last_active_at = $2 WHERE user_id = $3`,
        [newDays, now.toISOString(), userId]
      );
      return newDays;
    }
  }

  // 首次登录或断签，重置为1
  await dbPool.query(
    `UPDATE agent_state SET consecutive_days = 1, first_active_at = COALESCE(first_active_at, $1), last_active_at = $1 WHERE user_id = $2`,
    [now.toISOString(), userId]
  );
  return 1;
};

/**
 * 获取已解锁彩蛋列表
 */
export const getUnlockedEggs = async (userId: number): Promise<string[]> => {
  const state = await getAgentState(userId);
  return state.unlocked_eggs;
};

/**
 * 获取性格标签
 */
export const getPersonalityTags = async (userId: number): Promise<string[]> => {
  const state = await getAgentState(userId);
  return state.personality_tags || [];
};

/**
 * 根据行为分析更新性格标签
 */
export const updatePersonalityTags = async (userId: number): Promise<string[]> => {
  // 获取用户行为统计
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const result: any = await dbPool.query(
    `SELECT 
      COALESCE(SUM(sign_in_count), 0) as total_sign,
      COALESCE(SUM(post_count), 0) as total_post,
      COALESCE(SUM(invite_count), 0) as total_invite,
      COALESCE(SUM(territory_count), 0) as total_territory,
      COALESCE(SUM(market_count), 0) as total_market
    FROM agent_daily_exp
    WHERE user_id = $1 AND action_date >= $2`,
    [userId, thirtyDaysAgo.toISOString().slice(0, 10)]
  );

  const stats = result.rows[0] || {};
  const tags: string[] = [];

  // 发帖多 → 爱分享
  if ((stats.total_post || 0) >= 30) {
    tags.push('sharer');
  }

  // 邀请多 → 社交达人
  if ((stats.total_invite || 0) >= 5) {
    tags.push('social');
  }

  // 领地升级多 → 工匠精神
  if ((stats.total_territory || 0) >= 3) {
    tags.push('builder');
  }

  // 浏览多但互动少 → 沉默观察
  if ((stats.total_market || 0) >= 20 && (stats.total_post || 0) < 10) {
    tags.push('observer');
  }

  // 更新性格标签
  if (tags.length > 0) {
    await dbPool.query(
      `UPDATE agent_state SET personality_tags = $1::text[] WHERE user_id = $2`,
      [tags, userId]
    );
  }

  return tags;
};

/**
 * 获取守护灵固定回复（V1.0简化版）
 */
export const getAgentDialogue = async (
  userId: number,
  dialogueType: string
): Promise<{ text: string }> => {
  const responses: Record<string, string[]> = {
    daily_advice: [
      '今日宜签到，记得完成每日任务哦~',
      '今天的风向不错，适合去集市逛逛。',
      '今日星象显示：宜邀请好友~'
    ],
    story: [
      '从前有一颗星星，它每天都在等待一个人...',
      '很久以前，有一片森林住着一只守护灵...',
      '星辰运转间，我看到了一个关于你的故事...'
    ],
    memory: [
      '我记得你提过喜欢某款游戏...',
      '你的偏好，我都记得。',
      '我们一起经历了这么多，我都记着呢。'
    ]
  };

  const options = responses[dialogueType] || responses.daily_advice;
  const text = options[Math.floor(Math.random() * options.length)];

  // 记录对话
  await dbPool.query(
    `INSERT INTO agent_dialogues (user_id, agent_type, trigger_event, response_text, delivered_at)
     SELECT $1, guardian_type, $2, $3, NOW() FROM users WHERE id = $1`,
    [userId, `dialogue_${dialogueType}`, text]
  );

  // 增加亲密度
  await addBond(userId, 'dialogue');

  return { text };
};

// ======================== 定时任务 ========================

/**
 * 每日凌晨检查连续未登录用户
 * 需要在外部通过cron或定时任务调用
 */
export const checkAbsenceAndNotify = async (): Promise<void> => {
  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const result: any = await dbPool.query(
    `SELECT user_id, agent_level, consecutive_days
     FROM agent_state
     WHERE agent_level >= 8
       AND last_active_at < $1
       AND last_active_at >= $2`,
    [twoDaysAgo.toISOString(), new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()]
  );

  for (const row of result.rows) {
    await checkAndTriggerCare(row.user_id, 'absence');
    logger.info('连续未登录关心已发送', { userId: row.user_id });
  }
};

/**
 * 连续登录7天触发关心
 */
export const checkConsecutiveLogin = async (userId: number): Promise<void> => {
  const state = await getAgentState(userId);
  
  if (state.consecutive_days === 7) {
    await checkAndTriggerCare(userId, 'consecutive');
  }
};

/**
 * 启动守护灵关心定时任务
 * 每天凌晨2点检查连续未登录用户
 */
export const startAgentCareScheduler = (): void => {
  console.log('守护灵主动关心定时任务启动...');

  const checkAndNotify = async () => {
    try {
      await checkAbsenceAndNotify();
      console.log('守护灵关心检查完成');
    } catch (error: any) {
      logger.error('守护灵关心检查失败', { error: error.message });
    }
  };

  // 计算距离下一个凌晨2点的毫秒数
  const scheduleNextRun = () => {
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    const msUntil2AM = next2AM.getTime() - now.getTime();

    setTimeout(() => {
      checkAndNotify();
      // 之后每24小时执行一次
      setInterval(() => checkAndNotify(), 24 * 60 * 60 * 1000);
    }, msUntil2AM);

    console.log(`守护灵关心检查将在 ${next2AM.toLocaleString()} 首次执行`);
  };

  scheduleNextRun();
  console.log('守护灵主动关心定时任务已启动');
};
