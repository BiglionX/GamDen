import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { auditText, processAuditResult } from './contentAuditService';

export interface CreateClubParams {
  name: string;
  game_name: string;
  description?: string;
  owner_id: number;
}

export interface CreatePostParams {
  club_id: number;
  user_id: number;
  content: string;
}

export interface CreateReplyParams {
  post_id: number;
  user_id: number;
  content: string;
}

/**
 * 创建俱乐部
 */
export const createClub = async (params: CreateClubParams): Promise<{ club_id: number; openim_group_id: string }> => {
  const { name, game_name, description, owner_id } = params;
  
  // 检查俱乐部名称是否已存在
  const existingResult: any = await dbPool.query(
    'SELECT id FROM clubs WHERE name = $1',
    [name]
  );
  
  if (existingResult.rows.length > 0) {
    throw new Error('俱乐部名称已存在');
  }
  
  // 创建俱乐部
  const result: any = await dbPool.query(
    `INSERT INTO clubs (name, game_name, description, owner_id)
    VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, game_name, description || '', owner_id]
  );
  
  const clubId = result.rows[0].id;
  
  // 生成OpenIM群组ID（实际应该调用OpenIM API创建群组）
  const openimGroupId = `club_${clubId}_${Date.now()}`;
  
  // 更新OpenIM群组ID
  await dbPool.query(
    'UPDATE clubs SET openim_group_id = $1 WHERE id = $2',
    [openimGroupId, clubId]
  );
  
  logger.info('俱乐部创建成功', { clubId, name, owner_id });
  
  return {
    club_id: clubId,
    openim_group_id: openimGroupId
  };
};

/**
 * 获取俱乐部列表
 */
export const getClubList = async (
  page: number = 1,
  limit: number = 20,
  game_name?: string
): Promise<{ clubs: any[]; total: number }> => {
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM clubs WHERE status = \'active\'';
  let countQuery = 'SELECT COUNT(*) as total FROM clubs WHERE status = \'active\'';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (game_name) {
    query += ` AND game_name = $${paramIndex}`;
    countQuery += ` AND game_name = $${paramIndex}`;
    params.push(game_name);
    paramIndex++;
  }
  
  query += ` ORDER BY last_active_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const rowsResult: any = await dbPool.query(query, params);
  const countResult: any = await dbPool.query(countQuery, params.slice(0, -2));
  
  return {
    clubs: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 获取俱乐部详情
 */
export const getClubDetail = async (clubId: number): Promise<any> => {
  const result: any = await dbPool.query(
    'SELECT * FROM clubs WHERE id = $1 AND status = \'active\'',
    [clubId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('俱乐部不存在或已关闭');
  }
  
  return result.rows[0];
};

/**
 * 在俱乐部发帖
 */
export const createPost = async (params: CreatePostParams): Promise<{ post_id: number; status: string }> => {
  const { club_id, user_id, content } = params;
  
  // 检查俱乐部是否存在
  const clubResult: any = await dbPool.query(
    'SELECT id FROM clubs WHERE id = $1 AND status = \'active\'',
    [club_id]
  );
  
  if (clubResult.rows.length === 0) {
    throw new Error('俱乐部不存在或已关闭');
  }
  
  // 检查内容长度
  if (content.length > 500) {
    throw new Error('帖子内容不能超过500字');
  }
  
  // AI内容审核
  let postStatus = 'pending';
  try {
    const auditResult = await auditText(content);
    const processResult = processAuditResult(auditResult, 'post', 0, user_id);
    
    if (processResult.action === 'pass') {
      postStatus = 'approved';
    } else if (processResult.action === 'block') {
      throw new Error(`内容包含敏感词：${processResult.reason}`);
    } else {
      postStatus = 'pending'; // 进入人工复审池
    }
  } catch (error: any) {
    if (error.message.includes('敏感词')) {
      throw error;
    }
    console.warn('AI审核失败，将进入人工复审池:', error.message);
  }
  
  // 插入帖子
  const result: any = await dbPool.query(
    `INSERT INTO club_posts (club_id, user_id, content, status)
    VALUES ($1, $2, $3, $4) RETURNING id`,
    [club_id, user_id, content, postStatus]
  );
  
  const postId = result.rows[0].id;
  
  // 更新审核日志中的content_id
  await dbPool.query(
    `UPDATE content_audit_logs SET content_id = $1 WHERE content_type = 'post' AND content_id = 0`,
    [postId]
  );
  
  // 更新俱乐部帖子数
  await dbPool.query(
    'UPDATE clubs SET post_count = post_count + 1, last_active_at = NOW() WHERE id = $1',
    [club_id]
  );
  
  logger.info('帖子发布成功', { postId, club_id, user_id, status: postStatus });
  
  return {
    post_id: postId,
    status: postStatus
  };
};

/**
 * 获取俱乐部帖子列表
 */
export const getClubPosts = async (
  clubId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ posts: any[]; total: number }> => {
  const offset = (page - 1) * limit;
  
  const rowsResult: any = await dbPool.query(
    `SELECT 
      p.*, u.nickname, u.avatar, u.guardian_type
    FROM club_posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.club_id = $1 AND p.status = 'approved'
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3`,
    [clubId, limit, offset]
  );
  
  const countResult: any = await dbPool.query(
    'SELECT COUNT(*) as total FROM club_posts WHERE club_id = $1 AND status = \'approved\'',
    [clubId]
  );
  
  return {
    posts: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 回复帖子
 */
export const createReply = async (params: CreateReplyParams): Promise<{ reply_id: number }> => {
  const { post_id, user_id, content } = params;
  
  // 检查帖子是否存在
  const postResult: any = await dbPool.query(
    'SELECT id FROM club_posts WHERE id = $1 AND status = \'approved\'',
    [post_id]
  );
  
  if (postResult.rows.length === 0) {
    throw new Error('帖子不存在或未通过审核');
  }
  
  // 检查内容长度
  if (content.length > 200) {
    throw new Error('回复内容不能超过200字');
  }
  
  // AI内容审核（回帖仅高风险进入人工复审）
  try {
    const auditResult = await auditText(content);
    
    // 回帖审核规则：置信度<70%才进入人工复审
    if (auditResult.confidence < 70 || auditResult.suggestion === 'Block') {
      console.warn(`回帖AI审核不通过：`, auditResult);
      // 记录审核日志
      await dbPool.query(
        `INSERT INTO content_audit_logs 
         (content_type, content_id, user_id, ai_result, ai_confidence) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['reply', 0, user_id, auditResult.suggestion, auditResult.confidence]
      );
      
      // 对于回帖，AI审核不通过直接拒绝
      throw new Error(`内容包含敏感词：${auditResult.label}`);
    }
  } catch (error: any) {
    if (error.message.includes('敏感词')) {
      throw error;
    }
    console.warn('AI审核失败，将正常发布:', error.message);
  }
  
  // 插入回复
  const result: any = await dbPool.query(
    `INSERT INTO post_replies (post_id, user_id, content)
    VALUES ($1, $2, $3) RETURNING id`,
    [post_id, user_id, content]
  );
  
  const replyId = result.rows[0].id;
  
  // 更新审核日志中的content_id
  await dbPool.query(
    `UPDATE content_audit_logs SET content_id = $1 WHERE content_type = 'reply' AND content_id = 0`,
    [replyId]
  );
  
  // 更新帖子回复数
  await dbPool.query(
    'UPDATE club_posts SET reply_count = reply_count + 1 WHERE id = $1',
    [post_id]
  );
  
  logger.info('回复发布成功', { replyId, post_id, user_id });
  
  return {
    reply_id: replyId
  };
};
