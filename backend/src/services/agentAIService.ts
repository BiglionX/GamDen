/**
 * 守护灵 AI 对话服务
 * 
 * 功能：
 * - 发送 AI 对话消息
 * - 获取能量状态
 * - 降智模式处理
 * - Token 消耗管理
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { 
  callDeepSeekAPI, 
  buildSystemPrompt, 
  recordTokenUsage, 
  Message,
  estimateTokens 
} from './deepseekService';
import { getAgentState } from './agentUpgradeService';
import { saveConversation, extractLongTermMemory, getConversationCount } from './agentMemoryService';

// ======================== 常量配置 ========================

const DAILY_FREE_TOKEN = parseInt(process.env.AI_DAILY_FREE_TOKEN || '100000', 10);
const MEMORY_EXTRACT_THRESHOLD = parseInt(process.env.AI_MEMORY_EXTRACT_THRESHOLD || '10', 10);

// 能量等级阈值
const ENERGY_THRESHOLDS = {
  abundant: 0.3,   // > 30% 为充沛
  low: 0.1        // > 10% 为低能量，< 10% 为枯竭
};

// 降智话术映射
const DEGRADED_RESPONSES: Record<string, { depleted: string; low: string }> = {
  mechanic: {
    depleted: '能量耗尽。进入省电模式。如需继续智能对话，请补充灵力。',
    low: '能量储备低于30%。建议及时补充灵力以保证智能对话质量。'
  },
  elf: {
    depleted: '我今天好累哦……先睡一会儿，明天再陪你说话好吗？',
    low: '灵力有点不够用了……补充一点我就能陪你更久哦~'
  },
  astrologer: {
    depleted: '星力枯竭。今日的演算到此为止。明日星辉重聚时，我们再谈。',
    low: '星辰的光芒正在减弱。补充星力后，我能看到更多关于你的事。'
  },
  ranger: {
    depleted: '体力透支了……让我歇一会儿，明天再带你去看新的风景。',
    low: '脚步有点沉了。补充点体力，我就能陪你走更远。'
  },
  artisan: {
    depleted: '锤子和凿子都拿不动了……让我打个盹，明天再开工。',
    low: '炉火不太旺了。加点燃料，我就能打出更好的作品。'
  },
  apostle: {
    depleted: '盾牌太重了……请让我休息片刻。',
    low: '守护之力有些不足。补充灵力后，我能更好地守护你。'
  }
};

// ======================== 类型定义 ========================

export interface EnergyStatus {
  dailyUsed: number;
  dailyFree: number;
  purchasedBalance: number;
  remaining: number;
  total: number;
  percentage: number;
  level: 'abundant' | 'low' | 'depleted';
  lastResetAt: string | null;
}

export interface ChatResponse {
  text: string;
  tokensUsed: number;
  isDegraded: boolean;
  degradedReason?: string;
  remainingToken: number;
}

export interface AgentState {
  user_id: number;
  guardian_type: string;
  daily_token_used: number;
  purchased_token_balance: number;
  last_token_reset_at: string | null;
}

// ======================== 核心功能 ========================

/**
 * 获取用户守护灵类型
 */
const getGuardianType = async (userId: number): Promise<string> => {
  const result: any = await dbPool!.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  return result.rows[0].guardian_type || 'mechanic';
};

/**
 * 获取完整能量状态
 */
export const getEnergyStatus = async (userId: number): Promise<EnergyStatus> => {
  // 检查是否需要重置
  await checkAndResetDailyToken(userId);
  
  // 获取守护灵状态
  const result: any = await dbPool!.query(
    `SELECT a.daily_token_used, a.purchased_token_balance, a.last_token_reset_at, u.guardian_type
     FROM agent_state a
     JOIN users u ON a.user_id = u.id
     WHERE a.user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('守护灵状态不存在');
  }
  
  const row = result.rows[0];
  const dailyUsed = row.daily_token_used || 0;
  const purchasedBalance = row.purchased_token_balance || 0;
  
  // 计算总可用 Token（今日免费 + 已购买余额）
  const total = DAILY_FREE_TOKEN + purchasedBalance;
  
  // 计算剩余 Token
  const remaining = Math.max(0, total - dailyUsed);
  
  // 计算百分比
  const percentage = total > 0 ? remaining / DAILY_FREE_TOKEN : 0;
  
  // 判断能量等级
  let level: 'abundant' | 'low' | 'depleted';
  if (percentage > ENERGY_THRESHOLDS.abundant) {
    level = 'abundant';
  } else if (percentage > ENERGY_THRESHOLDS.low) {
    level = 'low';
  } else {
    level = 'depleted';
  }
  
  return {
    dailyUsed,
    dailyFree: DAILY_FREE_TOKEN,
    purchasedBalance,
    remaining,
    total,
    percentage,
    level,
    lastResetAt: row.last_token_reset_at
  };
};

/**
 * 检查并重置每日 Token
 */
export const checkAndResetDailyToken = async (userId: number): Promise<boolean> => {
  const result: any = await dbPool!.query(
    'SELECT last_token_reset_at FROM agent_state WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return false;
  }
  
  const lastReset = result.rows[0].last_token_reset_at;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // 如果上次重置不是今天，则重置
  if (!lastReset || lastReset.slice(0, 10) !== today) {
    await dbPool!.query(
      `UPDATE agent_state 
       SET daily_token_used = 0, last_token_reset_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    
    logger.info('每日 Token 已重置', { userId });
    return true;
  }
  
  return false;
};

/**
 * 检查是否可以进行 AI 对话
 */
const canUseAI = async (userId: number): Promise<{ canUse: boolean; reason?: string }> => {
  const status = await getEnergyStatus(userId);
  
  if (status.remaining <= 0) {
    return { canUse: false, reason: 'depleted' };
  }
  
  if (status.level === 'low') {
    return { canUse: true, reason: 'low' }; // 允许使用但提示低能量
  }
  
  return { canUse: true };
};

/**
 * 获取降智回复
 */
export const getDegradedResponse = (agentType: string, reason: 'depleted' | 'low'): string => {
  const responses = DEGRADED_RESPONSES[agentType] || DEGRADED_RESPONSES.mechanic;
  return reason === 'depleted' ? responses.depleted : responses.low;
};

/**
 * 获取降智模式对话
 */
const getDegradedChat = async (userId: number, userMessage: string): Promise<ChatResponse> => {
  const guardianType = await getGuardianType(userId);
  const status = await getEnergyStatus(userId);
  
  // 优先使用低能量提示
  const reason = status.remaining <= 0 ? 'depleted' : 'low';
  const degradedText = getDegradedResponse(guardianType, reason);
  
  // 保存用户消息（不消耗 Token）
  await saveConversation(userId, 'user', userMessage, 0);
  
  // 返回降智回复
  return {
    text: degradedText,
    tokensUsed: 0,
    isDegraded: true,
    degradedReason: reason,
    remainingToken: status.remaining
  };
};

/**
 * 发送 AI 对话
 */
export const sendAgentChat = async (
  userId: number,
  userMessage: string
): Promise<ChatResponse> => {
  const startTime = Date.now();
  
  try {
    // 检查是否可以进行 AI 对话
    const { canUse, reason } = await canUseAI(userId);
    
    if (!canUse) {
      // 进入降智模式
      return await getDegradedChat(userId, userMessage);
    }
    
    // 保存用户消息
    const userTokens = estimateTokens(userMessage);
    
    // 构建消息列表
    const systemPrompt = await buildSystemPrompt(userId);
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];
    
    // 调用 DeepSeek API
    const response = await callDeepSeekAPI(messages);
    
    // 记录 Token 消耗
    await recordTokenUsage(userId, response.usage.prompt_tokens, response.usage.completion_tokens);
    
    // 保存对话记录
    const totalTokens = response.usage.total_tokens;
    await saveConversation(userId, 'user', userMessage, userTokens);
    await saveConversation(userId, 'agent', response.content, response.usage.completion_tokens);
    
    // 检查是否需要提取长期记忆
    await checkAndExtractMemory(userId);
    
    // 获取更新后的能量状态
    const status = await getEnergyStatus(userId);
    
    const duration = Date.now() - startTime;
    logger.info('AI 对话完成', { 
      userId, 
      tokensUsed: totalTokens, 
      duration,
      remaining: status.remaining 
    });
    
    // 检查是否触发了低能量阈值
    const lowEnergyWarning = reason === 'low' ? getDegradedResponse(
      await getGuardianType(userId), 
      'low'
    ) : undefined;
    
    return {
      text: response.content,
      tokensUsed: totalTokens,
      isDegraded: false,
      degradedReason: lowEnergyWarning,
      remainingToken: status.remaining
    };
    
  } catch (error: any) {
    logger.error('AI 对话失败', { userId, error: error.message });
    throw error;
  }
};

/**
 * 检查并提取长期记忆
 */
const checkAndExtractMemory = async (userId: number): Promise<void> => {
  try {
    const count = await getConversationCount(userId);
    
    // 每隔 MEMORY_EXTRACT_THRESHOLD 轮对话触发一次记忆提取
    if (count > 0 && count % MEMORY_EXTRACT_THRESHOLD === 0) {
      logger.info('触发长期记忆提取', { userId, conversationCount: count });
      await extractLongTermMemory(userId);
    }
  } catch (error: any) {
    logger.warn('记忆提取失败', { userId, error: error.message });
  }
};

/**
 * 获取对话历史（带能量检查）
 */
export const getChatHistory = async (
  userId: number,
  limit: number = 50
): Promise<{ 
  conversations: { role: string; content: string; created_at: string }[];
  isDegraded: boolean;
  energyLevel: string;
}> => {
  // 检查能量状态
  const status = await getEnergyStatus(userId);
  
  // 获取对话历史
  const result: any = await dbPool!.query(
    `SELECT role, content, created_at FROM agent_conversations 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  
  // 反转，让最早的在前面
  const conversations = result.rows.reverse();
  
  return {
    conversations,
    isDegraded: status.level === 'depleted',
    energyLevel: status.level
  };
};

/**
 * 获取对话统计
 */
export const getChatStats = async (userId: number): Promise<{
  todayTokens: number;
  todayRequests: number;
  totalConversations: number;
}> => {
  const today = new Date().toISOString().slice(0, 10);
  
  // 获取今日使用统计
  const usageResult: any = await dbPool!.query(
    `SELECT tokens_used, request_count FROM agent_daily_token_usage 
     WHERE user_id = $1 AND usage_date = $2`,
    [userId, today]
  );
  
  // 获取总对话数
  const countResult: any = await dbPool!.query(
    `SELECT COUNT(*) as total FROM agent_conversations WHERE user_id = $1`,
    [userId]
  );
  
  const usage = usageResult.rows[0] || { tokens_used: 0, request_count: 0 };
  
  return {
    todayTokens: usage.tokens_used || 0,
    todayRequests: usage.request_count || 0,
    totalConversations: parseInt(countResult.rows[0]?.total || '0', 10)
  };
};
