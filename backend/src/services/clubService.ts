import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

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
  const [existingClubs]: any = await dbPool.execute(
    'SELECT id FROM clubs WHERE name = ?',
    [name]
  );
  
  if (existingClubs.length > 0) {
    throw new Error('俱乐部名称已存在');
  }
  
  // 创建俱乐部
  const [result]: any = await dbPool.execute(
    `INSERT INTO clubs (name, game_name, description, owner_id)
    VALUES (?, ?, ?, ?)`,
    [name, game_name, description || '', owner_id]
  );
  
  const clubId = result.insertId;
  
  // 生成OpenIM群组ID（实际应该调用OpenIM API创建群组）
  const openimGroupId = `club_${clubId}_${Date.now()}`;
  
  // 更新OpenIM群组ID
  await dbPool.execute(
    'UPDATE clubs SET openim_group_id = ? WHERE id = ?',
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
  
  let query = 'SELECT * FROM clubs WHERE status = "active"';
  let countQuery = 'SELECT COUNT(*) as total FROM clubs WHERE status = "active"';
  const params: any[] = [];
  
  if (game_name) {
    query += ' AND game_name = ?';
    countQuery += ' AND game_name = ?';
    params.push(game_name);
  }
  
  query += ' ORDER BY last_active_at DESC LIMIT ? OFFSET ?';
  
  const [rows]: any = await dbPool.execute(query, [...params, limit, offset]);
  const [countRows]: any = await dbPool.execute(countQuery, params);
  
  return {
    clubs: rows,
    total: countRows[0].total
  };
};

/**
 * 获取俱乐部详情
 */
export const getClubDetail = async (clubId: number): Promise<any> => {
  const [rows]: any = await dbPool.execute(
    'SELECT * FROM clubs WHERE id = ? AND status = "active"',
    [clubId]
  );
  
  if (rows.length === 0) {
    throw new Error('俱乐部不存在或已关闭');
  }
  
  return rows[0];
};

/**
 * 在俱乐部发帖
 */
export const createPost = async (params: CreatePostParams): Promise<{ post_id: number; status: string }> => {
  const { club_id, user_id, content } = params;
  
  // 检查俱乐部是否存在
  const [clubRows]: any = await dbPool.execute(
    'SELECT id FROM clubs WHERE id = ? AND status = "active"',
    [club_id]
  );
  
  if (clubRows.length === 0) {
    throw new Error('俱乐部不存在或已关闭');
  }
  
  // 检查内容长度
  if (content.length > 500) {
    throw new Error('帖子内容不能超过500字');
  }
  
  // 插入帖子
  const [result]: any = await dbPool.execute(
    `INSERT INTO club_posts (club_id, user_id, content, status)
    VALUES (?, ?, ?, 'pending')`,
    [club_id, user_id, content]
  );
  
  const postId = result.insertId;
  
  // 更新俱乐部帖子数
  await dbPool.execute(
    'UPDATE clubs SET post_count = post_count + 1, last_active_at = NOW() WHERE id = ?',
    [club_id]
  );
  
  logger.info('帖子发布成功，待审核', { postId, club_id, user_id });
  
  return {
    post_id: postId,
    status: 'pending'
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
  
  const [rows]: any = await dbPool.execute(
    `SELECT 
      p.*, u.nickname, u.avatar, u.guardian_type
    FROM club_posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.club_id = ? AND p.status = 'approved'
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
    [clubId, limit, offset]
  );
  
  const [countRows]: any = await dbPool.execute(
    'SELECT COUNT(*) as total FROM club_posts WHERE club_id = ? AND status = "approved"',
    [clubId]
  );
  
  return {
    posts: rows,
    total: countRows[0].total
  };
};

/**
 * 回复帖子
 */
export const createReply = async (params: CreateReplyParams): Promise<{ reply_id: number }> => {
  const { post_id, user_id, content } = params;
  
  // 检查帖子是否存在
  const [postRows]: any = await dbPool.execute(
    'SELECT id FROM club_posts WHERE id = ? AND status = "approved"',
    [post_id]
  );
  
  if (postRows.length === 0) {
    throw new Error('帖子不存在或未通过审核');
  }
  
  // 检查内容长度
  if (content.length > 200) {
    throw new Error('回复内容不能超过200字');
  }
  
  // 插入回复
  const [result]: any = await dbPool.execute(
    `INSERT INTO post_replies (post_id, user_id, content)
    VALUES (?, ?, ?)`,
    [post_id, user_id, content]
  );
  
  const replyId = result.insertId;
  
  // 更新帖子回复数
  await dbPool.execute(
    'UPDATE club_posts SET reply_count = reply_count + 1 WHERE id = ?',
    [post_id]
  );
  
  return {
    reply_id: replyId
  };
};
