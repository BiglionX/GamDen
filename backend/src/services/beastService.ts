import { dbPool } from '../config/database';
import { addExperience, getTerritoryInfo } from './territoryService';
import { AppError } from '../middleware/errorHandler';

/**
 * 野兽潮服务
 * 处理野兽潮的触发、防御逻辑
 */

/**
 * 检查并触发野兽潮
 * 由定时任务调用（每小时检查一次）
 */
export const checkAndTriggerBeastTide = async (): Promise<void> => {
  try {
    // 获取野兽潮配置
    const configResult = await dbPool!.query('SELECT * FROM beast_config WHERE id = 1');
    
    if (configResult.rows.length === 0) {
      console.warn('⚠️ 野兽潮配置不存在，跳过检查');
      return;
    }
    
    const config = configResult.rows[0];
    
    // 根据概率决定是否触发野兽潮
    const triggerProbability = config.trigger_probability; // 0-100
    const random = Math.random() * 100;
    
    if (random > triggerProbability) {
      console.log(`🐺 野兽潮检查：未触发（概率：${triggerProbability}%，随机数：${random.toFixed(2)}%）`);
      return;
    }
    
    // 触发野兽潮
    console.log('🐺 野兽潮触发！');
    
    // 生成野兽潮等级（在配置范围内）
    const beastLevel = Math.floor(Math.random() * (config.max_level - config.min_level + 1)) + config.min_level;
    
    // 随机选择触发坐标（在-1000~+1000范围内）
    const coordX = Math.floor(Math.random() * 2001) - 1000;
    const coordY = Math.floor(Math.random() * 2001) - 1000;
    
    // 查找受影响用户（坐标在影响范围内的用户）
    const affectRange = config.affect_range;
    const affectedUsersResult = await dbPool!.query(
      `SELECT id, level, territory_coord_x, territory_coord_y 
       FROM users 
       WHERE 
         territory_coord_x BETWEEN $1 AND $2 AND
         territory_coord_y BETWEEN $3 AND $4 AND
         status = 'active'`,
      [coordX - affectRange, coordX + affectRange, coordY - affectRange, coordY + affectRange]
    );
    
    const affectedUsers = affectedUsersResult.rows;
    
    if (affectedUsers.length === 0) {
      console.log('🐺 野兽潮未影响任何用户');
      return;
    }
    
    console.log(`🐺 野兽潮影响 ${affectedUsers.length} 个用户`);
    
    // 创建野兽潮事件记录
    const beastEventResult = await dbPool!.query(
      `INSERT INTO beast_events (event_level, coord_x, coord_y, affected_users, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
      [
        beastLevel,
        coordX,
        coordY,
        JSON.stringify(affectedUsers.map((u: any) => u.id))
      ]
    );
    
    const beastEventId = beastEventResult.rows[0].id;
    
    // 处理每个受影响用户的防御
    for (const user of affectedUsers) {
      await processDefense(user.id, user.level, beastLevel, beastEventId, config.defense_fail_probability);
    }
    
    // 更新野兽潮事件状态为已解决
    await dbPool!.query(
      'UPDATE beast_events SET status = \'resolved\', resolved_at = CURRENT_TIMESTAMP WHERE id = $1',
      [beastEventId]
    );
    
    console.log(`🐺 野兽潮事件 ${beastEventId} 已解决`);
  } catch (error: any) {
    console.error('❌ 野兽潮检查失败:', error.message);
  }
};

/**
 * 处理用户防御
 * @param userId 用户ID
 * @param userLevel 用户等级
 * @param beastLevel 野兽潮等级
 * @param beastEventId 野兽潮事件ID
 * @param defenseFailProbability 防御失败概率（Lv.3以下）
 */
const processDefense = async (
  userId: number,
  userLevel: number,
  beastLevel: number,
  beastEventId: number,
  defenseFailProbability: number
): Promise<void> => {
  try {
    let defenseSuccess = false;
    
    // 防御判定
    if (userLevel >= 3) {
      // Lv.3以上100%防御成功
      defenseSuccess = true;
    } else {
      // Lv.3以下根据配置概率判定
      const random = Math.random() * 100;
      defenseSuccess = random > defenseFailProbability;
    }
    
    if (defenseSuccess) {
      // 防御成功
      console.log(`🐺 用户 ${userId} 防御成功（Lv.${userLevel}）`);
      
      // 计算奖励金币（根据野兽潮等级）
      const rewardGold = 50 * beastLevel; // Lv.1=50, Lv.5=250
      
      // 更新用户金币
      await dbPool!.query(
        'UPDATE users SET gold_coins = gold_coins + $1 WHERE id = $2',
        [rewardGold, userId]
      );
      
      // 记录金币流水
      const goldResult = await dbPool!.query('SELECT gold_coins FROM users WHERE id = $1', [userId]);
      const balanceAfter = goldResult.rows[0].gold_coins;
      
      await dbPool!.query(
        `INSERT INTO gold_transactions (user_id, transaction_type, amount, source, balance_after, description)
         VALUES ($1, 'earn', $2, 'defend_beast', $3, $4)`,
        [userId, rewardGold, balanceAfter, `防御野兽潮Lv.${beastLevel}成功，获得${rewardGold}金币`]
      );
      
      // 增加经验值
      try {
        await addExperience(userId, 20, 'defend_beast');
      } catch (error: any) {
        console.error('增加经验值失败:', error.message);
      }
      
      // 发送Agent通知（防御成功）
      await sendAgentNotification(userId, 'defend_success', beastLevel, rewardGold);
    } else {
      // 防御失败
      console.log(`🐺 用户 ${userId} 防御失败（Lv.${userLevel}）`);
      
      // 领地等级-1（最低Lv.1）
      const newLevel = Math.max(1, userLevel - 1);
      
      await dbPool!.query(
        'UPDATE users SET level = $1 WHERE id = $2',
        [newLevel, userId]
      );
      
      // 发送Agent通知（防御失败）
      await sendAgentNotification(userId, 'defend_fail', beastLevel, 0);
    }
  } catch (error: any) {
    console.error(`❌ 处理用户 ${userId} 防御失败:`, error.message);
  }
};

/**
 * 发送Agent通知
 * @param userId 用户ID
 * @param eventType 事件类型（defend_success/defend_fail）
 * @param beastLevel 野兽潮等级
 * @param rewardGold 奖励金币（失败时为0）
 */
const sendAgentNotification = async (
  userId: number,
  eventType: 'defend_success' | 'defend_fail',
  beastLevel: number,
  rewardGold: number
): Promise<void> => {
  try {
    // 获取用户信息
    const territoryInfo = await getTerritoryInfo(userId);
    const guardianType = territoryInfo.guardian_type;
    
    // 根据守护灵类型和事件类型生成通知内容
    let responseText = '';
    
    if (guardianType === 'mechanic') {
      if (eventType === 'defend_success') {
        responseText = '检测：防御系统运行良好。野兽潮已被击退。';
      } else {
        responseText = '警告：防御系统受损。领地等级下降。';
      }
    } else if (guardianType === 'elf') {
      if (eventType === 'defend_success') {
        responseText = '森林安全了~野兽已经离开。';
      } else {
        responseText = '呜...森林受伤了。需要时间恢复...';
      }
    } else if (guardianType === 'astrologer') {
      if (eventType === 'defend_success') {
        responseText = '星辰之力驱散了黑暗。';
      } else {
        responseText = '星象紊乱...需要时间重新校准。';
      }
    }
    
    if (eventType === 'defend_success' && rewardGold > 0) {
      responseText += `获得${rewardGold}金币奖励。`;
    }
    
    // 记录Agent对话日志
    await dbPool!.query(
      `INSERT INTO agent_dialogues (user_id, agent_type, trigger_event, response_text, delivered_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, guardianType, `defend_${eventType}`, responseText]
    );
    
    console.log(`🤖 发送Agent通知给用户 ${userId}: ${responseText}`);
  } catch (error: any) {
    console.error('❌ 发送Agent通知失败:', error.message);
  }
};

/**
 * 获取野兽潮状态
 * 供API调用，返回当前活跃的野兽潮事件
 */
export const getBeastStatus = async (userId: number): Promise<{
  has_beast_event: boolean;
  nearby_events: any[];
}> => {
  try {
    // 获取用户坐标
    const userResult = await dbPool!.query(
      'SELECT territory_coord_x, territory_coord_y FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    const user = userResult.rows[0];
    
    // 查询附近的活跃野兽潮事件
    const eventsResult = await dbPool!.query(
      `SELECT * FROM beast_events 
       WHERE status = 'active' 
       AND coord_x BETWEEN $1 AND $2 
       AND coord_y BETWEEN $3 AND $4`,
      [user.territory_coord_x - 20, user.territory_coord_x + 20, user.territory_coord_y - 20, user.territory_coord_y + 20]
    );
    
    const nearbyEvents = eventsResult.rows;
    
    return {
      has_beast_event: nearbyEvents.length > 0,
      nearby_events: nearbyEvents
    };
  } catch (error: any) {
    console.error('❌ 获取野兽潮状态失败:', error.message);
    return {
      has_beast_event: false,
      nearby_events: []
    };
  }
};

/**
 * 启动野兽潮定时任务
 * 在服务器启动时调用
 */
export const startBeastTideScheduler = (): void => {
  console.log('🐺 野兽潮定时任务启动...');
  
  // 立即执行一次
  checkAndTriggerBeastTide();
  
  // 每小时执行一次
  setInterval(async () => {
    await checkAndTriggerBeastTide();
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('✅ 野兽潮定时任务已启动（每小时检查一次）');
};
