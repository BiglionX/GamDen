import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

export interface AgentMessage {
  user_id: number;
  agent_type: 'mechanic' | 'elf' | 'astrologer';
  trigger_event: string;
  response_text: string;
}

// 守护灵话术模板（V1.0固定话术，不接入大模型）
const AGENT_TEMPLATES: { [key: string]: { [key: string]: string } } = {
  mechanic: {
    welcome: '检测到新信号。欢迎归巢，编号{user_id}。',
    sign_in_remind: '今日补给未领取，建议执行。',
    invite_success: '新坐标已校准，盟友已就位。',
    level_up: '系统升级完成。你现在更强了。',
    defend_success: '防御系统运行良好。野兽潮已被击退。',
    defend_fail: '警告：防御系统受损。领地等级下降。'
  },
  elf: {
    welcome: '呜~森林在颤动。你终于来了。',
    sign_in_remind: '太阳晒到树梢了，该浇水啦~',
    invite_success: '新芽破土了！你的盟友就在旁边。',
    level_up: '古树长高了。你正在变得强大。',
    defend_success: '森林的守护之力战胜了黑暗。',
    defend_fail: '森林受到了伤害。需要时间来恢复。'
  },
  astrologer: {
    welcome: '星辰轨迹中，我看到了你的到来。',
    sign_in_remind: '星盘显示，今日宜签到。',
    invite_success: '命运之线已连接，盟友就在你身旁。',
    level_up: '星力涌动。你的境界突破了。',
    defend_success: '星界之力驱散了混沌。',
    defend_fail: '星辰黯淡。需要重新凝聚星力。'
  }
};

/**
 * 获取守护灵话术
 */
export const getAgentResponse = async (
  userId: number,
  triggerEvent: string
): Promise<string> => {
  // 获取用户守护灵类型
  const result: any = await dbPool.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const agentType = rows[0].guardian_type;
  
  // 获取话术模板
  const template = AGENT_TEMPLATES[agentType]?.[triggerEvent];
  
  if (!template) {
    return '守护灵沉默中...';
  }
  
  // 替换模板变量
  const response = template.replace('{user_id}', userId.toString());
  
  return response;
};

/**
 * 发送守护灵消息（记录到数据库）
 */
export const sendAgentMessage = async (
  userId: number,
  triggerEvent: string
): Promise<AgentMessage> => {
  // 获取话术
  const responseText = await getAgentResponse(userId, triggerEvent);
  
  // 获取守护灵类型
  const result: any = await dbPool.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  const agentType = rows[0].guardian_type;
  
  // 记录到数据库
  await dbPool.query(
    `INSERT INTO agent_dialogues (user_id, agent_type, trigger_event, response_text, delivered_at)
    VALUES ($1, $2, $3, $4, NOW())`,
    [userId, agentType, triggerEvent, responseText]
  );
  
  logger.info('守护灵消息发送', { userId, agentType, triggerEvent });
  
  return {
    user_id: userId,
    agent_type: agentType,
    trigger_event: triggerEvent,
    response_text: responseText
  };
};

/**
 * 获取守护灵对话历史
 */
export const getAgentDialogues = async (
  userId: number,
  limit: number = 20
): Promise<any[]> => {
  const result: any = await dbPool.query(
    'SELECT * FROM agent_dialogues WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  
  return result.rows;
};

/**
 * 触发事件：欢迎语（注册成功）
 */
export const triggerWelcome = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'welcome');
};

/**
 * 触发事件：签到提醒
 */
export const triggerSignInRemind = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'sign_in_remind');
};

/**
 * 触发事件：邀请成功
 */
export const triggerInviteSuccess = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'invite_success');
};

/**
 * 触发事件：等级提升
 */
export const triggerLevelUp = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'level_up');
};

/**
 * 触发事件：防御成功
 */
export const triggerDefendSuccess = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'defend_success');
};

/**
 * 触发事件：防御失败
 */
export const triggerDefendFail = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'defend_fail');
};
