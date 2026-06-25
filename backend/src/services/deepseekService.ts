/**
 * DeepSeek API 集成服务
 * 
 * 功能：
 * - 调用 DeepSeek 大模型生成回复
 * - 构建守护灵专属 System Prompt
 * - Token 消耗统计
 */

import OpenAI from 'openai';
import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

// ======================== 类型定义 ========================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ======================== 常量配置 ========================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const DEFAULT_TEMPERATURE = 0.8;
const DEFAULT_MAX_TOKENS = 300;
const MAX_CONTEXT_MESSAGES = parseInt(process.env.AI_MAX_CONTEXT_MESSAGES || '20', 10);

// ======================== OpenAI 客户端初始化 ========================

let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key 未配置');
    }
    openaiClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: DEEPSEEK_API_KEY,
    });
  }
  return openaiClient;
};

// ======================== 守护灵配置 ========================

const GUARDIAN_NAMES: Record<string, string> = {
  mechanic: 'M-07',
  elf: '灵',
  astrologer: '星',
  ranger: '风',
  artisan: '匠',
  apostle: '守'
};

const GUARDIAN_PERSONALITY: Record<string, Record<string, string>> = {
  mechanic: {
    trait: '理性冷静，擅长数据分析和逻辑推理',
    style: '机械、简洁、数据化',
    speech: '系统、数据、协议、模块'
  },
  elf: {
    trait: '感性敏锐，亲近自然，充满生机',
    style: '温柔、活泼、充满想象力',
    speech: '森林、光、自然、陪伴'
  },
  astrologer: {
    trait: '神秘深邃，通晓星象命运',
    style: '神秘、高雅、充满哲理',
    speech: '星辰、命运、观测、未来'
  },
  ranger: {
    trait: '自由不羁，热爱冒险与探索',
    style: '豪爽、乐观、充满活力',
    speech: '冒险、地图、远方、出发'
  },
  artisan: {
    trait: '热爱创造，沉迷工艺与打磨',
    style: '专注、耐心、追求完美',
    speech: '工坊、锤子、材料、锻造'
  },
  apostle: {
    trait: '守护同伴，信念坚定忠诚',
    style: '温暖、坚定、充满使命感',
    speech: '守护、盾牌、誓言、陪伴'
  }
};

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: '初出茅庐的新手守护灵',
  2: '开始适应的新手守护灵',
  3: '渐入佳境的成长者',
  4: '初具智能的伙伴',
  5: '默契十足的搭档',
  6: '记忆深刻的知己',
  7: '心有灵犀的挚友',
  8: '主动关心的守护者',
  9: '心意相通的灵魂伴侣',
  10: '不可分割的存在'
};

const BOND_DESCRIPTIONS: Record<number, string> = {
  1: '刚刚相识的伙伴',
  2: '开始熟悉的搭档',
  3: '相互了解的朋友',
  4: '心意相通的挚友',
  5: '生死与共的羁绊'
};

// ======================== 核心功能 ========================

/**
 * 调用 DeepSeek API 生成回复
 */
export const callDeepSeekAPI = async (
  messages: Message[],
  options?: ChatCompletionOptions
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> => {
  const client = getOpenAIClient();

  const requestMessages = messages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }));

  try {
    const completion = await client.chat.completions.create({
      model: options?.model || DEEPSEEK_MODEL,
      messages: requestMessages,
      temperature: options?.temperature || DEFAULT_TEMPERATURE,
      max_tokens: options?.max_tokens || DEFAULT_MAX_TOKENS,
      top_p: options?.top_p,
      frequency_penalty: options?.frequency_penalty,
      presence_penalty: options?.presence_penalty,
      stream: false,
    } as any);

    const choice = completion.choices[0];

    if (!choice) {
      throw new Error('API 返回无效响应');
    }

    return {
      content: choice.message.content || '',
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      }
    };
  } catch (error: any) {
    logger.error('DeepSeek API 错误', { error: error.message });
    throw error;
  }
};

/**
 * 获取用户和守护灵信息
 */
const getUserAndAgentInfo = async (userId: number): Promise<{
  userName: string;
  agentType: string;
  guardianName: string;
  agentLevel: number;
  bondLevel: number;
  personalityTags: string[];
}> => {
  const result: any = await dbPool!.query(
    `SELECT u.name, u.guardian_type, a.agent_level, a.bond_level, a.personality_tags
     FROM users u
     LEFT JOIN agent_state a ON u.id = a.user_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  const row = result.rows[0];
  const agentType = row.guardian_type || 'mechanic';
  const agentLevel = row.agent_level || 1;
  const bondLevel = row.bond_level || 1;
  const personalityTags = row.personality_tags || [];
  const guardianName = GUARDIAN_NAMES[agentType] || '守护灵';

  return {
    userName: row.name || '主人',
    agentType,
    guardianName,
    agentLevel,
    bondLevel,
    personalityTags
  };
};

/**
 * 获取长期记忆（最多5条）
 */
const getLongTermMemories = async (userId: number, limit: number = 5): Promise<string[]> => {
  const result: any = await dbPool!.query(
    `SELECT content FROM agent_memories 
     WHERE user_id = $1 
     ORDER BY importance DESC, updated_at DESC 
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row: any) => row.content);
};

/**
 * 获取对话历史（最近N轮）
 */
const getConversationHistory = async (userId: number, limit: number = 20): Promise<{ role: string; content: string }[]> => {
  const result: any = await dbPool!.query(
    `SELECT role, content FROM agent_conversations 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );

  // 反转，让最早的在前面
  return result.rows.reverse();
};

/**
 * 构建 System Prompt
 */
export const buildSystemPrompt = async (userId: number): Promise<string> => {
  const info = await getUserAndAgentInfo(userId);
  const memories = await getLongTermMemories(userId, 5);
  const history = await getConversationHistory(userId, MAX_CONTEXT_MESSAGES);
  const personality = GUARDIAN_PERSONALITY[info.agentType] || GUARDIAN_PERSONALITY.mechanic;

  // 性格标签描述
  const personalityDesc = info.personalityTags.length > 0
    ? `主人被守护灵认为是：${info.personalityTags.join('、')}`
    : '主人是刚刚认识的新朋友';

  // 记忆库内容
  const memorySection = memories.length > 0
    ? memories.map((m, i) => `${i + 1}. ${m}`).join('\n')
    : '（暂无记忆，请通过对话慢慢了解主人）';

  // 对话历史
  const historySection = history.length > 0
    ? history.map((h, i) => `${i === 0 ? '' : '\n'}${h.role === 'user' ? '主人' : info.guardianName}：${h.content}`).join('')
    : '（这是我们第一次对话）';

  const currentTime = new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `你是一位 ${info.agentType === 'mechanic' ? '机械师' : 
                  info.agentType === 'elf' ? '精灵' : 
                  info.agentType === 'astrologer' ? '占星师' :
                  info.agentType === 'ranger' ? '游侠' :
                  info.agentType === 'artisan' ? '工匠' : '使徒'} 类型的守护灵。

【基本信息】
- 你的名字：${info.guardianName}
- 主人名字：${info.userName}

【你的性格】
${personality.trait}
说话风格：${personality.style}
常用词汇：${personality.speech}

【你的等级】
Lv.${info.agentLevel} - ${LEVEL_DESCRIPTIONS[info.agentLevel] || LEVEL_DESCRIPTIONS[1]}

【你与主人的关系】
亲密度 Bond.${info.bondLevel}：${BOND_DESCRIPTIONS[info.bondLevel] || BOND_DESCRIPTIONS[1]}

${personalityDesc}

【你的记忆库】
以下是你记住的关于主人的事情：
${memorySection}

【对话历史】
${historySection}

【当前时间】
${currentTime}

【回复要求】
1. 你的语气要符合守护灵类型和当前等级
2. 若主人提及记忆库中的内容，应表现出"我记得"
3. 每次回复控制在100字以内
4. 适当使用符合角色风格的语气词
5. 不要说"我是AI"或"我没有感情"
6. 作为守护灵，你应该主动关心主人、记住主人的喜好
7. 如果主人提到喜欢的游戏或话题，可以适当延伸
8. 在对话中体现等级成长带来的变化（等级越高越了解主人）`;
};

/**
 * 计算 Token 数量（估算）
 * 注意：这是粗略估算，实际以 API 返回的 usage 为准
 */
export const estimateTokens = (text: string): number => {
  // 中文字符约等于 2 个 token，英文约等于 0.25 个 token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 2 + otherChars * 0.25);
};

/**
 * 记录 Token 使用
 */
export const recordTokenUsage = async (
  userId: number,
  promptTokens: number,
  completionTokens: number
): Promise<void> => {
  const totalTokens = promptTokens + completionTokens;
  const today = new Date().toISOString().slice(0, 10);

  // 更新 agent_state
  await dbPool!.query(
    `UPDATE agent_state 
     SET daily_token_used = daily_token_used + $1, updated_at = NOW()
     WHERE user_id = $2`,
    [totalTokens, userId]
  );

  // 更新每日使用记录
  await dbPool!.query(
    `INSERT INTO agent_daily_token_usage (user_id, usage_date, tokens_used, request_count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, usage_date) 
     DO UPDATE SET 
       tokens_used = agent_daily_token_usage.tokens_used + $3,
       request_count = agent_daily_token_usage.request_count + 1,
       updated_at = NOW()`,
    [userId, today, totalTokens]
  );

  logger.info('Token 使用记录', { userId, promptTokens, completionTokens, totalTokens });
};

/**
 * 健康检查
 */
export const deepseekHealthCheck = async (): Promise<{ status: string; configured: boolean }> => {
  return {
    status: DEEPSEEK_API_KEY ? 'configured' : 'not_configured',
    configured: !!DEEPSEEK_API_KEY
  };
};
