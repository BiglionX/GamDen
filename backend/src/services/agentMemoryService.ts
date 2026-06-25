/**
 * 守护灵记忆管理服务
 * 
 * 功能：
 * - 保存对话记录
 * - 获取对话历史
 * - 提取长期记忆
 * - 管理记忆列表
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { callDeepSeekAPI, Message } from './deepseekService';

// ======================== 类型定义 ========================

export interface Conversation {
  id: number;
  user_id: number;
  role: 'user' | 'agent';
  content: string;
  tokens_consumed: number;
  created_at: string;
}

export interface Memory {
  id: number;
  user_id: number;
  memory_type: 'game_preference' | 'emotion' | 'habit' | 'relationship' | 'other';
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMemory {
  type: string;
  content: string;
  importance: number;
}

// ======================== 记忆提取 Prompt ========================

const MEMORY_EXTRACTION_PROMPT = `你是一位细心的守护灵。请从以下对话中提取关于主人的重要记忆信息。

要求：
1. 提取主人提到的游戏偏好、兴趣爱好
2. 提取主人的情感状态、心情变化
3. 提取主人的生活习惯、日常行为
4. 提取与主人的关系变化、重要时刻
5. 每个记忆用一句话描述

请以JSON数组格式返回，示例：
[
  {"type": "game_preference", "content": "主人喜欢像素风游戏，特别提到《星露谷物语》", "importance": 4},
  {"type": "emotion", "content": "主人说最近工作压力很大", "importance": 3}
]

注意：
- type 可选值：game_preference, emotion, habit, relationship, other
- importance 为1-5的数字，表示记忆的重要程度
- 只返回JSON数组，不要有其他内容
- 如果对话中没有有价值的信息，返回空数组 []

对话内容：
{conversations}`;

// ======================== 核心功能 ========================

/**
 * 保存对话记录
 */
export const saveConversation = async (
  userId: number,
  role: 'user' | 'agent',
  content: string,
  tokensConsumed: number = 0
): Promise<number> => {
  const result: any = await dbPool!.query(
    `INSERT INTO agent_conversations (user_id, role, content, tokens_consumed, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [userId, role, content, tokensConsumed]
  );
  
  logger.debug('对话记录已保存', { userId, role, contentLength: content.length });
  
  return result.rows[0].id;
};

/**
 * 获取对话历史
 */
export const getConversations = async (
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<Conversation[]> => {
  const result: any = await dbPool!.query(
    `SELECT id, user_id, role, content, tokens_consumed, created_at
     FROM agent_conversations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  return result.rows;
};

/**
 * 获取对话历史（简化版，用于记忆提取）
 */
export const getConversationHistory = async (
  userId: number,
  limit: number = 10
): Promise<{ role: string; content: string }[]> => {
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
 * 获取对话数量
 */
export const getConversationCount = async (userId: number): Promise<number> => {
  const result: any = await dbPool!.query(
    `SELECT COUNT(*) as count FROM agent_conversations WHERE user_id = $1`,
    [userId]
  );
  
  return parseInt(result.rows[0]?.count || '0', 10);
};

/**
 * 删除指定数量的旧对话
 */
export const pruneOldConversations = async (
  userId: number,
  keepCount: number = 100
): Promise<number> => {
  const result: any = await dbPool!.query(
    `DELETE FROM agent_conversations
     WHERE user_id = $1 AND id NOT IN (
       SELECT id FROM agent_conversations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     )
     RETURNING id`,
    [userId, keepCount]
  );
  
  const deletedCount = result.rowCount || 0;
  
  if (deletedCount > 0) {
    logger.info('旧对话已清理', { userId, deletedCount, keepCount });
  }
  
  return deletedCount;
};

/**
 * 清空对话历史
 */
export const clearConversationHistory = async (userId: number): Promise<number> => {
  const result: any = await dbPool!.query(
    'DELETE FROM agent_conversations WHERE user_id = $1',
    [userId]
  );
  
  const deletedCount = result.rowCount || 0;
  
  logger.info('对话历史已清空', { userId, deletedCount });
  
  return deletedCount;
};

/**
 * 提取长期记忆
 */
export const extractLongTermMemory = async (userId: number): Promise<Memory[]> => {
  // 获取最近对话
  const history = await getConversationHistory(userId, 10);
  
  if (history.length < 5) {
    logger.debug('对话数量不足，跳过记忆提取', { userId, count: history.length });
    return [];
  }
  
  // 构建提取 Prompt
  const conversationText = history.map(h => `${h.role}: ${h.content}`).join('\n');
  const prompt = MEMORY_EXTRACTION_PROMPT.replace('{conversations}', conversationText);
  
  try {
    // 调用 AI 提取记忆
    const messages: Message[] = [
      { role: 'user', content: prompt }
    ];
    
    const response = await callDeepSeekAPI(messages, {
      temperature: 0.3, // 低温度保证提取质量
      max_tokens: 500
    });
    
    // 解析返回的 JSON
    let extractedMemories: ExtractedMemory[];
    try {
      // 尝试清理返回内容，只保留 JSON 部分
      let jsonStr = response.content.trim();
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      extractedMemories = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.warn('记忆提取解析失败', { userId, response: response.content });
      return [];
    }
    
    if (!Array.isArray(extractedMemories) || extractedMemories.length === 0) {
      logger.debug('未提取到有效记忆', { userId });
      return [];
    }
    
    // 保存记忆到数据库
    const savedMemories: Memory[] = [];
    
    for (const mem of extractedMemories) {
      // 验证类型
      const validTypes = ['game_preference', 'emotion', 'habit', 'relationship', 'other'];
      const type = validTypes.includes(mem.type) ? mem.type : 'other';
      const importance = Math.min(5, Math.max(1, mem.importance || 3));
      
      const result: any = await dbPool!.query(
        `INSERT INTO agent_memories (user_id, memory_type, content, importance, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [userId, type, mem.content, importance]
      );
      
      savedMemories.push(result.rows[0]);
    }
    
    logger.info('长期记忆已提取并保存', { userId, count: savedMemories.length });
    
    return savedMemories;
    
  } catch (error: any) {
    logger.error('记忆提取失败', { userId, error: error.message });
    return [];
  }
};

/**
 * 获取长期记忆列表
 */
export const getLongTermMemories = async (
  userId: number,
  limit: number = 20,
  type?: string
): Promise<Memory[]> => {
  let query = `
    SELECT id, user_id, memory_type, content, importance, created_at, updated_at
    FROM agent_memories
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  
  if (type) {
    query += ` AND memory_type = $2`;
    params.push(type);
  }
  
  query += ` ORDER BY importance DESC, updated_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result: any = await dbPool!.query(query, params);
  
  return result.rows;
};

/**
 * 删除指定记忆
 */
export const deleteMemory = async (memoryId: number, userId: number): Promise<boolean> => {
  const result: any = await dbPool!.query(
    'DELETE FROM agent_memories WHERE id = $1 AND user_id = $2 RETURNING id',
    [memoryId, userId]
  );
  
  return (result.rowCount || 0) > 0;
};

/**
 * 更新记忆重要性
 */
export const updateMemoryImportance = async (
  memoryId: number,
  userId: number,
  importance: number
): Promise<boolean> => {
  const result: any = await dbPool!.query(
    `UPDATE agent_memories 
     SET importance = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id`,
    [Math.min(5, Math.max(1, importance)), memoryId, userId]
  );
  
  return (result.rowCount || 0) > 0;
};

/**
 * 获取记忆统计
 */
export const getMemoryStats = async (userId: number): Promise<{
  total: number;
  byType: Record<string, number>;
}> => {
  const result: any = await dbPool!.query(
    `SELECT memory_type, COUNT(*) as count
     FROM agent_memories
     WHERE user_id = $1
     GROUP BY memory_type`,
    [userId]
  );
  
  const byType: Record<string, number> = {};
  let total = 0;
  
  for (const row of result.rows) {
    byType[row.memory_type] = parseInt(row.count, 10);
    total += byType[row.memory_type];
  }
  
  return { total, byType };
};

/**
 * 检查记忆重复（相似内容不重复添加）
 */
export const isDuplicateMemory = async (
  userId: number,
  content: string,
  threshold: number = 0.8
): Promise<boolean> => {
  // 简单的关键词匹配检查
  const keywords = content.slice(0, 20); // 取前20个字符作为关键词
  
  const result: any = await dbPool!.query(
    `SELECT content FROM agent_memories 
     WHERE user_id = $1 AND content LIKE $2
     LIMIT 1`,
    [userId, `%${keywords}%`]
  );
  
  return result.rows.length > 0;
};

/**
 * 添加记忆（带重复检查）
 */
export const addMemory = async (
  userId: number,
  type: string,
  content: string,
  importance: number = 3
): Promise<Memory | null> => {
  // 检查重复
  const isDuplicate = await isDuplicateMemory(userId, content);
  if (isDuplicate) {
    logger.debug('记忆重复，跳过添加', { userId, content: content.slice(0, 20) });
    return null;
  }
  
  const result: any = await dbPool!.query(
    `INSERT INTO agent_memories (user_id, memory_type, content, importance, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [userId, type, content, Math.min(5, Math.max(1, importance))]
  );
  
  logger.info('记忆已添加', { userId, type, content: content.slice(0, 30) });
  
  return result.rows[0];
};
