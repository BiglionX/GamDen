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

  // 检查用户等级（需Lv.2以上才能创建俱乐部）
  const userResult: any = await dbPool.query(
    'SELECT level FROM users WHERE id = $1 AND status = \'active\'',
    [owner_id]
  );

  if (userResult.rows.length === 0) {
    throw new Error('用户不存在或已被冻结');
  }

  if (userResult.rows[0].level < 2) {
    throw new Error('需要Lv.2以上才能创建俱乐部');
  }

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

/**
 * 删除帖子
 * 权限：帖子作者、俱乐部管理员、运营人员
 */
export const deletePost = async (params: {
  post_id: number;
  user_id: number;
  user_role: string;
  club_owner_id?: number;
}): Promise<void> => {
  const { post_id, user_id, user_role, club_owner_id } = params;

  // 查询帖子信息
  const postResult: any = await dbPool.query(
    `SELECT p.*, c.owner_id as club_owner_id
     FROM club_posts p
     JOIN clubs c ON p.club_id = c.id
     WHERE p.id = $1`,
    [post_id]
  );

  if (postResult.rows.length === 0) {
    throw new Error('帖子不存在');
  }

  const post = postResult.rows[0];

  // 权限检查：作者本人、俱乐部管理员、运营/超级管理员
  const isAuthor = post.user_id === user_id;
  const isClubOwner = post.club_owner_id === user_id;
  const isAdmin = user_role === 'operator' || user_role === 'super_admin';

  if (!isAuthor && !isClubOwner && !isAdmin) {
    throw new Error('无权限删除此帖子');
  }

  // 删除帖子（级联删除回复）
  await dbPool.query('DELETE FROM club_posts WHERE id = $1', [post_id]);

  // 更新俱乐部帖子数
  await dbPool.query(
    'UPDATE clubs SET post_count = GREATEST(0, post_count - 1) WHERE id = $1',
    [post.club_id]
  );

  // 如果是作者删除，扣除经验值和金币
  if (isAuthor) {
    await dbPool.query(
      'UPDATE users SET exp = GREATEST(0, exp - 5) WHERE id = $1',
      [user_id]
    );
    await dbPool.query(
      'UPDATE users SET gold_coins = GREATEST(0, gold_coins - 5) WHERE id = $1',
      [user_id]
    );
  }

  logger.info('帖子已删除', { postId: post_id, userId: user_id, isAuthor });
};

/**
 * 获取帖子回复列表
 */
export const getPostReplies = async (
  postId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ replies: any[]; total: number }> => {
  const offset = (page - 1) * limit;

  const rowsResult: any = await dbPool.query(
    `SELECT
      r.*, u.nickname, u.avatar, u.guardian_type
    FROM post_replies r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.post_id = $1 AND r.status = 'approved'
    ORDER BY r.created_at ASC
    LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );

  const countResult: any = await dbPool.query(
    'SELECT COUNT(*) as total FROM post_replies WHERE post_id = $1 AND status = \'approved\'',
    [postId]
  );

  return {
    replies: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

// ============================================
// 俱乐部升级系统：活力值相关
// ============================================

/** 活力值等级配置 */
export const VITALITY_LEVELS = {
  bronze: { min: 0, max: 199, icon: '🥉' },
  silver: { min: 200, max: 499, icon: '🥈' },
  gold: { min: 500, max: 999, icon: '🥇' },
  diamond: { min: 1000, max: Infinity, icon: '💎' }
};

/** 活力值来源配置 */
export const VITALITY_SOURCES = {
  member_join: { delta: 10, daily_limit: 50 },
  new_post: { delta: 2, daily_limit: 100 },
  post_interaction: { delta: 1, daily_limit: 80 },
  daily_active_user: { delta: 5, daily_limit: 50 },
  continuous_active: { delta: 20, daily_limit: Infinity }
};

/**
 * 计算活力值等级
 */
export const calculateVitalityLevel = (vitality: number): string => {
  if (vitality >= 1000) return 'diamond';
  if (vitality >= 500) return 'gold';
  if (vitality >= 200) return 'silver';
  return 'bronze';
};

/**
 * 更新俱乐部活力值
 */
export const updateVitality = async (
  clubId: number,
  delta: number,
  source: string
): Promise<{ new_vitality: number; new_level: string }> => {
  // 获取当前活力值
  const current: any = await dbPool.query(
    'SELECT vitality, vitality_level FROM clubs WHERE id = $1',
    [clubId]
  );

  if (current.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  const oldVitality = current.rows[0].vitality || 0;
  const oldLevel = current.rows[0].vitality_level || 'bronze';

  // 计算新活力值（不小于0）
  const newVitality = Math.max(0, oldVitality + delta);
  const newLevel = calculateVitalityLevel(newVitality);

  // 更新俱乐部活力值
  await dbPool.query(
    `UPDATE clubs 
     SET vitality = $1, vitality_level = $2, vitality_updated_at = NOW()
     WHERE id = $3`,
    [newVitality, newLevel, clubId]
  );

  // 记录活力值日志
  await dbPool.query(
    `INSERT INTO club_vitality_logs (club_id, delta, source)
     VALUES ($1, $2, $3)`,
    [clubId, delta, source]
  );

  logger.info('活力值更新', { clubId, delta, source, oldVitality, newVitality, oldLevel, newLevel });

  return {
    new_vitality: newVitality,
    new_level: newLevel
  };
};

/**
 * 获取俱乐部列表（扩展版，支持分类和标签筛选）
 */
export const getClubListExtended = async (params: {
  page?: number;
  limit?: number;
  club_type?: string;
  tags?: string[];
  keyword?: string;
  vitality_level?: string;
  sort_by?: 'vitality' | 'member_count' | 'created_at';
  sort_order?: 'asc' | 'desc';
}): Promise<{ clubs: any[]; total: number }> => {
  const {
    page = 1,
    limit = 20,
    club_type,
    tags,
    keyword,
    vitality_level,
    sort_by = 'vitality',
    sort_order = 'desc'
  } = params;

  const offset = (page - 1) * limit;
  const conditions: string[] = ["status IN ('active', 'dormant')"];
  const paramsList: any[] = [];
  let paramIndex = 1;

  if (club_type) {
    conditions.push(`club_type = $${paramIndex++}`);
    paramsList.push(club_type);
  }

  if (tags && tags.length > 0) {
    // 使用数组重叠操作符 &&
    conditions.push(`tags && $${paramIndex++}`);
    paramsList.push(tags);
  }

  if (keyword) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    paramsList.push(`%${keyword}%`);
    paramIndex++;
  }

  if (vitality_level) {
    conditions.push(`vitality_level = $${paramIndex++}`);
    paramsList.push(vitality_level);
  }

  const orderColumn = {
    vitality: 'vitality',
    member_count: 'member_count',
    created_at: 'created_at'
  }[sort_by] || 'vitality';

  const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  // 默认俱乐部始终置顶
  const query = `
    SELECT c.*, 
      (CASE WHEN club_type = 'default' THEN 0 ELSE 1 END) as is_not_default
    FROM clubs c
    WHERE ${conditions.join(' AND ')}
    ORDER BY is_not_default ASC, ${orderColumn} ${orderDirection}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM clubs
    WHERE ${conditions.join(' AND ')}
  `;

  paramsList.push(limit, offset);

  const rowsResult: any = await dbPool.query(query, paramsList);
  const countResult: any = await dbPool.query(countQuery, paramsList.slice(0, -2));

  return {
    clubs: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 自动加入默认俱乐部（闲云茶馆）
 */
export const autoJoinDefaultClub = async (userId: number): Promise<{ club_id: number; group_id: string } | null> => {
  // 查找默认俱乐部
  const defaultClub: any = await dbPool.query(
    "SELECT id, openim_group_id FROM clubs WHERE club_type = 'default' AND status = 'active' LIMIT 1"
  );

  if (defaultClub.rows.length === 0) {
    logger.warn('未找到默认俱乐部');
    return null;
  }

  const club = defaultClub.rows[0];

  // 检查是否已经是成员
  const existingMember: any = await dbPool.query(
    'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2',
    [club.id, userId]
  );

  if (existingMember.rows.length > 0) {
    return { club_id: club.id, group_id: club.openim_group_id };
  }

  // 添加为成员
  await dbPool.query(
    `INSERT INTO club_members (club_id, user_id, role)
     VALUES ($1, $2, 'member')`,
    [club.id, userId]
  );

  // 更新俱乐部成员数
  await dbPool.query(
    'UPDATE clubs SET member_count = member_count + 1 WHERE id = $1',
    [club.id]
  );

  // 增加活力值
  await updateVitality(club.id, VITALITY_SOURCES.member_join.delta, 'member_join');

  logger.info('用户自动加入默认俱乐部', { userId, clubId: club.id });

  return { club_id: club.id, group_id: club.openim_group_id };
};

/**
 * 获取用户可能感兴趣的俱乐部推荐
 */
export const getRecommendedClubs = async (
  userId: number,
  limit: number = 5
): Promise<any[]> => {
  // 获取用户的守护灵类型和游戏偏好
  const user: any = await dbPool.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );

  if (user.rows.length === 0) {
    return [];
  }

  const guardianType = user.rows[0].guardian_type;

  // 守护灵类型对应的兴趣标签
  const guardianTags: Record<string, string[]> = {
    mechanic: ['pvp', '竞技', '策略', '硬核'],
    elf: ['休闲', '收集', '社交', '种田'],
    astrologer: ['剧情', 'RPG', '二次元'],
    ranger: ['竞技', '对战', 'PVP'],
    artisan: ['建造', '经营', '创作'],
    apostle: ['社交', '交友', '聊天']
  };

  const preferredTags = guardianTags[guardianType] || [];

  // 获取用户已加入的俱乐部
  const joinedClubs: any = await dbPool.query(
    'SELECT club_id FROM club_members WHERE user_id = $1',
    [userId]
  );
  const joinedClubIds = joinedClubs.rows.map((r: any) => r.club_id);

  // 推荐未加入的、活跃的兴趣/游戏俱乐部
  const placeholders = joinedClubIds.length > 0
    ? `AND id NOT IN (${joinedClubIds.join(',')})`
    : '';

  const recommendedClubs: any = await dbPool.query(
    `SELECT * FROM clubs 
     WHERE status = 'active' 
       AND club_type IN ('interest', 'game')
       ${placeholders}
     ORDER BY vitality DESC, member_count DESC
     LIMIT $1`,
    [limit]
  );

  return recommendedClubs.rows;
};

// ============================================
// 俱乐部升级系统：成员管理
// ============================================

/**
 * 加入俱乐部
 */
export const joinClub = async (clubId: number, userId: number): Promise<{ success: boolean; message: string }> => {
  // 检查俱乐部是否存在
  const club: any = await dbPool.query(
    'SELECT * FROM clubs WHERE id = $1',
    [clubId]
  );

  if (club.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  const clubData = club.rows[0];

  // 检查俱乐部状态
  if (clubData.status !== 'active') {
    throw new Error('俱乐部已关闭或休眠中');
  }

  // 检查加入方式
  if (clubData.join_type === 'auto' && clubData.club_type !== 'default') {
    throw new Error('该俱乐部不支持主动加入');
  }

  // 检查是否已是成员
  const existingMember: any = await dbPool.query(
    'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId]
  );

  if (existingMember.rows.length > 0) {
    return { success: true, message: '您已经是该俱乐部成员' };
  }

  // 添加成员
  await dbPool.query(
    `INSERT INTO club_members (club_id, user_id, role)
     VALUES ($1, $2, 'member')`,
    [clubId, userId]
  );

  // 更新俱乐部成员数
  await dbPool.query(
    'UPDATE clubs SET member_count = member_count + 1 WHERE id = $1',
    [clubId]
  );

  // 增加活力值
  await updateVitality(clubId, VITALITY_SOURCES.member_join.delta, 'member_join');

  logger.info('用户加入俱乐部', { userId, clubId });

  return { success: true, message: '加入成功' };
};

/**
 * 退出俱乐部
 */
export const leaveClub = async (clubId: number, userId: number): Promise<{ success: boolean; message: string }> => {
  // 检查俱乐部是否存在
  const club: any = await dbPool.query(
    'SELECT * FROM clubs WHERE id = $1',
    [clubId]
  );

  if (club.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  const clubData = club.rows[0];

  // 默认俱乐部不可退出
  if (clubData.club_type === 'default') {
    throw new Error('默认俱乐部不可退出');
  }

  // 检查是否是成员
  const member: any = await dbPool.query(
    'SELECT id, role FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId]
  );

  if (member.rows.length === 0) {
    throw new Error('您不是该俱乐部成员');
  }

  // 群主不可退出
  if (member.rows[0].role === 'owner') {
    throw new Error('群主不可退出，请先转让群主权限');
  }

  // 移除成员
  await dbPool.query(
    'DELETE FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId]
  );

  // 更新俱乐部成员数
  await dbPool.query(
    'UPDATE clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = $1',
    [clubId]
  );

  logger.info('用户退出俱乐部', { userId, clubId });

  return { success: true, message: '已退出俱乐部' };
};

/**
 * 获取俱乐部成员列表
 */
export const getClubMembers = async (
  clubId: number,
  page: number = 1,
  limit: number = 50
): Promise<{ members: any[]; total: number }> => {
  const offset = (page - 1) * limit;

  const rowsResult: any = await dbPool.query(
    `SELECT cm.*, u.nickname, u.avatar, u.guardian_type, u.level
     FROM club_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.club_id = $1
     ORDER BY 
       CASE cm.role 
         WHEN 'owner' THEN 1 
         WHEN 'moderator' THEN 2 
         ELSE 3 
       END,
       cm.joined_at ASC
     LIMIT $2 OFFSET $3`,
    [clubId, limit, offset]
  );

  const countResult: any = await dbPool.query(
    'SELECT COUNT(*) as total FROM club_members WHERE club_id = $1',
    [clubId]
  );

  return {
    members: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 获取用户已加入的俱乐部列表
 */
export const getUserClubs = async (userId: number): Promise<any[]> => {
  const result: any = await dbPool.query(
    `SELECT c.*, cm.role, cm.joined_at, cm.last_active_at
     FROM clubs c
     JOIN club_members cm ON c.id = cm.club_id
     WHERE cm.user_id = $1 AND c.status IN ('active', 'dormant')
     ORDER BY c.club_type = 'default' DESC, cm.last_active_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * 检查用户是否是俱乐部成员
 */
export const isClubMember = async (clubId: number, userId: number): Promise<boolean> => {
  const result: any = await dbPool.query(
    'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId]
  );

  return result.rows.length > 0;
};

// ============================================
// 俱乐部升级系统：提议管理
// ============================================

export interface CreateProposalParams {
  proposer_id: number;
  name: string;
  description: string;
  proposal_type?: string;
  game_name?: string;
  tags?: string[];
}

/**
 * 创建俱乐部提议
 */
export const createProposal = async (params: CreateProposalParams): Promise<{ proposal_id: number }> => {
  const { proposer_id, name, description, proposal_type = 'other', game_name, tags = [] } = params;

  // 检查用户等级（需Lv.1以上）
  const user: any = await dbPool.query(
    'SELECT level FROM users WHERE id = $1 AND status = \'active\'',
    [proposer_id]
  );

  if (user.rows.length === 0) {
    throw new Error('用户不存在或已被冻结');
  }

  // 检查名称是否重复
  const existingClub: any = await dbPool.query(
    'SELECT id FROM clubs WHERE name = $1',
    [name]
  );

  if (existingClub.rows.length > 0) {
    throw new Error('该俱乐部名称已存在');
  }

  const existingProposal: any = await dbPool.query(
    "SELECT id FROM club_proposals WHERE name = $1 AND status = 'pending'",
    [name]
  );

  if (existingProposal.rows.length > 0) {
    throw new Error('已有相同的待审核提议');
  }

  // AI内容审核
  try {
    const auditResult = await auditText(name);
    if (auditResult.suggestion === 'Block') {
      throw new Error(`俱乐部名称包含敏感词`);
    }
  } catch (error: any) {
    if (error.message.includes('敏感词')) {
      throw error;
    }
    console.warn('AI审核失败:', error.message);
  }

  // 设置联署截止时间（7天后）
  const endorsementDeadline = new Date();
  endorsementDeadline.setDate(endorsementDeadline.getDate() + 7);

  // 创建提议
  const result: any = await dbPool.query(
    `INSERT INTO club_proposals 
     (proposer_id, name, description, proposal_type, game_name, tags, endorsement_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [proposer_id, name, description, proposal_type, game_name || null, tags, endorsementDeadline]
  );

  logger.info('俱乐部提议创建成功', { proposalId: result.rows[0].id, proposer_id, name });

  return { proposal_id: result.rows[0].id };
};

/**
 * 联署提议
 */
export const endorseProposal = async (
  proposalId: number,
  userId: number
): Promise<{ success: boolean; endorsement_count: number; auto_approved: boolean }> => {
  // 检查提议是否存在且处于pending状态
  const proposal: any = await dbPool.query(
    "SELECT * FROM club_proposals WHERE id = $1 AND status = 'pending'",
    [proposalId]
  );

  if (proposal.rows.length === 0) {
    throw new Error('提议不存在或已审核');
  }

  const proposalData = proposal.rows[0];

  // 检查是否已过期
  if (new Date(proposalData.endorsement_deadline) < new Date()) {
    // 标记为过期
    await dbPool.query(
      "UPDATE club_proposals SET status = 'expired' WHERE id = $1",
      [proposalId]
    );
    throw new Error('该提议已过期');
  }

  // 检查是否已联署
  const existingEndorsement: any = await dbPool.query(
    'SELECT id FROM club_endorsements WHERE proposal_id = $1 AND user_id = $2',
    [proposalId, userId]
  );

  if (existingEndorsement.rows.length > 0) {
    return { success: true, endorsement_count: proposalData.endorsement_count + 1, auto_approved: false };
  }

  // 添加联署记录
  await dbPool.query(
    'INSERT INTO club_endorsements (proposal_id, user_id) VALUES ($1, $2)',
    [proposalId, userId]
  );

  // 更新联署数
  const newCount = proposalData.endorsement_count + 1;
  await dbPool.query(
    'UPDATE club_proposals SET endorsement_count = $1 WHERE id = $2',
    [newCount, proposalId]
  );

  // 检查是否达到自动批准阈值（20人）
  let autoApproved = false;
  if (newCount >= 20) {
    await reviewProposal(proposalId, 'approve', 0); // 系统自动批准
    autoApproved = true;
  }

  logger.info('提议联署成功', { proposalId, userId, newCount, autoApproved });

  return { success: true, endorsement_count: newCount, auto_approved: autoApproved };
};

/**
 * 审核提议
 */
export const reviewProposal = async (
  proposalId: number,
  action: 'approve' | 'reject',
  reviewerId: number,
  comment?: string
): Promise<{ success: boolean; club_id?: number }> => {
  // 获取提议信息
  const proposal: any = await dbPool.query(
    'SELECT * FROM club_proposals WHERE id = $1',
    [proposalId]
  );

  if (proposal.rows.length === 0) {
    throw new Error('提议不存在');
  }

  const proposalData = proposal.rows[0];

  if (proposalData.status !== 'pending') {
    throw new Error('提议已审核');
  }

  if (action === 'approve') {
    // 创建俱乐部
    const clubResult: any = await dbPool.query(
      `INSERT INTO clubs (name, description, owner_id, club_type, game_name_ext, tags, join_type, status)
       VALUES ($1, $2, $3, 'custom', $4, $5, 'free', 'active')
       RETURNING id`,
      [
        proposalData.name,
        proposalData.description,
        proposalData.proposer_id,
        proposalData.game_name,
        proposalData.tags
      ]
    );

    const clubId = clubResult.rows[0].id;

    // 将提议人设为群主
    await dbPool.query(
      'INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, \'owner\')',
      [clubId, proposalData.proposer_id]
    );

    // 更新提议状态
    await dbPool.query(
      "UPDATE club_proposals SET status = 'approved', reviewed_by = $1, review_comment = $2 WHERE id = $3",
      [reviewerId || 0, comment || '系统自动批准', proposalId]
    );

    // 给提议人奖励
    await dbPool.query(
      'UPDATE users SET gold_coins = gold_coins + 50 WHERE id = $1',
      [proposalData.proposer_id]
    );

    // 记录金币流水
    await dbPool.query(
      `INSERT INTO gold_transactions (user_id, transaction_type, amount, source, balance_after, description)
       SELECT $1, 'earn', 50, 'proposal_reward', gold_coins, '俱乐部提议奖励' FROM users WHERE id = $1`,
      [proposalData.proposer_id]
    );

    logger.info('提议批准并创建俱乐部', { proposalId, clubId, proposerId: proposalData.proposer_id });

    return { success: true, club_id: clubId };
  } else {
    // 驳回提议
    await dbPool.query(
      "UPDATE club_proposals SET status = 'rejected', reviewed_by = $1, review_comment = $2 WHERE id = $3",
      [reviewerId || 0, comment || '', proposalId]
    );

    logger.info('提议驳回', { proposalId, reviewerId });

    return { success: true };
  }
};

/**
 * 获取提议列表
 */
export const getProposalList = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  proposal_type?: string;
  user_id?: number;
}): Promise<{ proposals: any[]; total: number }> => {
  const { page = 1, limit = 20, status, proposal_type, user_id } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const paramsList: any[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`cp.status = $${paramIndex++}`);
    paramsList.push(status);
  }

  if (proposal_type) {
    conditions.push(`cp.proposal_type = $${paramIndex++}`);
    paramsList.push(proposal_type);
  }

  if (user_id) {
    conditions.push(`cp.proposer_id = $${paramIndex++}`);
    paramsList.push(user_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT cp.*, u.nickname as proposer_name, u.avatar as proposer_avatar
    FROM club_proposals cp
    JOIN users u ON cp.proposer_id = u.id
    ${whereClause}
    ORDER BY cp.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM club_proposals cp
    ${whereClause}
  `;

  paramsList.push(limit, offset);

  const rowsResult: any = await dbPool.query(query, paramsList);
  const countResult: any = await dbPool.query(countQuery, paramsList.slice(0, -2));

  return {
    proposals: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 获取提议详情
 */
export const getProposalDetail = async (proposalId: number): Promise<any> => {
  const result: any = await dbPool.query(
    `SELECT cp.*, u.nickname as proposer_name, u.avatar as proposer_avatar
     FROM club_proposals cp
     JOIN users u ON cp.proposer_id = u.id
     WHERE cp.id = $1`,
    [proposalId]
  );

  if (result.rows.length === 0) {
    throw new Error('提议不存在');
  }

  return result.rows[0];
};

/**
 * 获取活力值排行榜
 */
export const getVitalityRanking = async (limit: number = 10): Promise<any[]> => {
  const result: any = await dbPool.query(
    `SELECT id, name, icon, vitality, vitality_level, member_count, post_count
     FROM clubs
     WHERE status = 'active' AND club_type != 'default'
     ORDER BY vitality DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
};

/**
 * 处理过期的提议
 */
export const processExpiredProposals = async (): Promise<number> => {
  const result: any = await dbPool.query(
    `UPDATE club_proposals 
     SET status = 'expired'
     WHERE status = 'pending' AND endorsement_deadline < NOW()
     RETURNING id`
  );

  if (result.rows.length > 0) {
    logger.info('处理过期提议', { count: result.rows.length });
  }

  return result.rows.length;
};
