/**
 * 俱乐部后台管理服务
 * 提供运营人员对俱乐部的管理能力
 */

import { dbPool } from '../config/database';
import { logger } from '../utils/logger';
import { calculateVitalityLevel, reviewProposal } from './clubService';

export interface ClubFilterParams {
  page?: number;
  limit?: number;
  club_type?: string;
  status?: string;
  vitality_level?: string;
  keyword?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface ProposalFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  proposal_type?: string;
}

/**
 * 获取俱乐部列表（管理后台）
 */
export const getClubListAdmin = async (params: ClubFilterParams): Promise<{ clubs: any[]; total: number }> => {
  const {
    page = 1,
    limit = 20,
    club_type,
    status,
    vitality_level,
    keyword,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = params;

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const paramsList: any[] = [];
  let paramIndex = 1;

  if (club_type) {
    conditions.push(`c.club_type = $${paramIndex++}`);
    paramsList.push(club_type);
  }

  if (status) {
    conditions.push(`c.status = $${paramIndex++}`);
    paramsList.push(status);
  }

  if (vitality_level) {
    conditions.push(`c.vitality_level = $${paramIndex++}`);
    paramsList.push(vitality_level);
  }

  if (keyword) {
    conditions.push(`(c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
    paramsList.push(`%${keyword}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderColumn = {
    created_at: 'c.created_at',
    vitality: 'c.vitality',
    member_count: 'c.member_count',
    post_count: 'c.post_count'
  }[sort_by] || 'c.created_at';

  const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT c.*, u.nickname as owner_name
    FROM clubs c
    LEFT JOIN users u ON c.owner_id = u.id
    ${whereClause}
    ORDER BY ${orderColumn} ${orderDirection}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM clubs c
    ${whereClause}
  `;

  paramsList.push(limit, offset);

  const rowsResult: any = await dbPool!.query(query, paramsList);
  const countResult: any = await dbPool!.query(countQuery, paramsList.slice(0, -2));

  return {
    clubs: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 获取俱乐部详情（管理后台）
 */
export const getClubDetailAdmin = async (clubId: number): Promise<any> => {
  const result: any = await dbPool!.query(
    `SELECT c.*, u.nickname as owner_name, u.level as owner_level
     FROM clubs c
     LEFT JOIN users u ON c.owner_id = u.id
     WHERE c.id = $1`,
    [clubId]
  );

  if (result.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  // 获取成员统计
  const memberStats: any = await dbPool!.query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE role = 'owner') as owners,
       COUNT(*) FILTER (WHERE role = 'moderator') as moderators,
       COUNT(*) FILTER (WHERE role = 'member') as members,
       COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days') as active_recently
     FROM club_members
     WHERE club_id = $1`,
    [clubId]
  );

  // 获取帖子统计
  const postStats: any = await dbPool!.query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week
     FROM club_posts
     WHERE club_id = $1`,
    [clubId]
  );

  return {
    ...result.rows[0],
    member_stats: memberStats.rows[0],
    post_stats: postStats.rows[0]
  };
};

/**
 * 更新俱乐部信息（管理后台）
 */
export const updateClubAdmin = async (
  clubId: number,
  data: {
    name?: string;
    description?: string;
    tags?: string[];
    join_type?: string;
    icon?: string;
  }
): Promise<void> => {
  const updates: string[] = [];
  const paramsList: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    // 检查名称是否重复
    const existing: any = await dbPool!.query(
      'SELECT id FROM clubs WHERE name = $1 AND id != $2',
      [data.name, clubId]
    );
    if (existing.rows.length > 0) {
      throw new Error('俱乐部名称已存在');
    }
    updates.push(`name = $${paramIndex++}`);
    paramsList.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    paramsList.push(data.description);
  }

  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    paramsList.push(data.tags);
  }

  if (data.join_type !== undefined) {
    updates.push(`join_type = $${paramIndex++}`);
    paramsList.push(data.join_type);
  }

  if (data.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    paramsList.push(data.icon);
  }

  if (updates.length === 0) {
    return;
  }

  updates.push('updated_at = NOW()');
  paramsList.push(clubId);

  await dbPool!.query(
    `UPDATE clubs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    paramsList
  );

  logger.info('管理员更新俱乐部信息', { clubId, updates: data });
};

/**
 * 更新俱乐部状态
 */
export const updateClubStatus = async (
  clubId: number,
  status: 'active' | 'dormant' | 'archived' | 'closed'
): Promise<void> => {
  const club: any = await dbPool!.query('SELECT club_type, status FROM clubs WHERE id = $1', [clubId]);

  if (club.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  // 默认俱乐部不可关闭
  if (club.rows[0].club_type === 'default' && status === 'closed') {
    throw new Error('默认俱乐部不可关闭');
  }

  await dbPool!.query(
    'UPDATE clubs SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, clubId]
  );

  logger.info('管理员更新俱乐部状态', { clubId, status });
};

/**
 * 删除俱乐部
 */
export const deleteClub = async (clubId: number): Promise<void> => {
  const club: any = await dbPool!.query('SELECT club_type FROM clubs WHERE id = $1', [clubId]);

  if (club.rows.length === 0) {
    throw new Error('俱乐部不存在');
  }

  if (club.rows[0].club_type === 'default') {
    throw new Error('默认俱乐部不可删除');
  }

  // 级联删除会处理相关数据
  await dbPool!.query('DELETE FROM clubs WHERE id = $1', [clubId]);

  logger.info('管理员删除俱乐部', { clubId });
};

/**
 * 获取提议审核列表
 */
export const getProposalReviewList = async (params: ProposalFilterParams): Promise<{ proposals: any[]; total: number }> => {
  const { page = 1, limit = 20, status, proposal_type } = params;
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT cp.*, u.nickname as proposer_name, u.avatar as proposer_avatar, u.level as proposer_level
    FROM club_proposals cp
    JOIN users u ON cp.proposer_id = u.id
    ${whereClause}
    ORDER BY 
      CASE cp.status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'rejected' THEN 3 
        ELSE 4 
      END,
      cp.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM club_proposals cp
    ${whereClause}
  `;

  paramsList.push(limit, offset);

  const rowsResult: any = await dbPool!.query(query, paramsList);
  const countResult: any = await dbPool!.query(countQuery, paramsList.slice(0, -2));

  return {
    proposals: rowsResult.rows,
    total: parseInt(countResult.rows[0].total)
  };
};

/**
 * 审核提议
 */
export const reviewProposalAdmin = async (
  proposalId: number,
  action: 'approve' | 'reject',
  reviewerId: number,
  comment?: string
): Promise<{ success: boolean; club_id?: number }> => {
  return reviewProposal(proposalId, action, reviewerId, comment);
};

/**
 * 批量审核提议
 */
export const batchReviewProposals = async (
  proposalIds: number[],
  action: 'approve' | 'reject',
  reviewerId: number
): Promise<{ success: number; failed: number; results: any[] }> => {
  const results: any[] = [];
  let success = 0;
  let failed = 0;

  for (const id of proposalIds) {
    try {
      const result = await reviewProposal(id, action, reviewerId);
      results.push({ id, reviewed: true, ...result });
      success++;
    } catch (error: any) {
      results.push({ id, reviewed: false, error: error.message });
      failed++;
    }
  }

  logger.info('批量审核提议', { action, success, failed });

  return { success, failed, results };
};

/**
 * 获取活力值统计
 */
export const getVitalityStats = async (): Promise<any> => {
  const stats: any = await dbPool!.query(`
    SELECT 
      COUNT(*) as total_clubs,
      COUNT(*) FILTER (WHERE status = 'active') as active_clubs,
      COUNT(*) FILTER (WHERE status = 'dormant') as dormant_clubs,
      COUNT(*) FILTER (WHERE status = 'archived') as archived_clubs,
      COUNT(*) FILTER (WHERE club_type = 'default') as default_clubs,
      COUNT(*) FILTER (WHERE club_type = 'interest') as interest_clubs,
      COUNT(*) FILTER (WHERE club_type = 'game') as game_clubs,
      COUNT(*) FILTER (WHERE club_type = 'custom') as custom_clubs,
      SUM(member_count) as total_members,
      AVG(vitality)::int as avg_vitality,
      MAX(vitality) as max_vitality,
      COUNT(*) FILTER (WHERE vitality >= 1000) as diamond_clubs,
      COUNT(*) FILTER (WHERE vitality >= 500 AND vitality < 1000) as gold_clubs,
      COUNT(*) FILTER (WHERE vitality >= 200 AND vitality < 500) as silver_clubs,
      COUNT(*) FILTER (WHERE vitality < 200) as bronze_clubs
    FROM clubs
    WHERE club_type != 'default'
  `);

  const memberStats: any = await dbPool!.query(`
    SELECT COUNT(DISTINCT user_id) as total_users_in_clubs
    FROM club_members cm
    JOIN clubs c ON cm.club_id = c.id
    WHERE c.club_type != 'default'
  `);

  return {
    ...stats.rows[0],
    total_users_in_clubs: parseInt(memberStats.rows[0].total_users_in_clubs) || 0
  };
};

/**
 * 获取活力值趋势数据
 */
export const getVitalityTrend = async (days: number = 7): Promise<any[]> => {
  const result: any = await dbPool!.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_changes,
      SUM(delta) as total_delta,
      AVG(delta)::int as avg_delta,
      COUNT(DISTINCT club_id) as clubs_affected
    FROM club_vitality_logs
    WHERE created_at > NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  return result.rows;
};

/**
 * 获取活力值TOP俱乐部
 */
export const getVitalityTopClubs = async (limit: number = 10): Promise<any[]> => {
  const result: any = await dbPool!.query(`
    SELECT 
      c.id, c.name, c.icon, c.club_type, c.vitality, c.vitality_level,
      c.member_count, c.post_count, c.status,
      u.nickname as owner_name,
      (SELECT COUNT(*) FROM club_vitality_logs cvl 
       WHERE cvl.club_id = c.id 
         AND cvl.created_at > NOW() - INTERVAL '7 days') as weekly_changes
    FROM clubs c
    LEFT JOIN users u ON c.owner_id = u.id
    WHERE c.club_type != 'default' AND c.status = 'active'
    ORDER BY c.vitality DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
};

/**
 * 获取低活力预警俱乐部
 */
export const getLowVitalityWarnings = async (): Promise<any[]> => {
  const result: any = await dbPool!.query(`
    SELECT 
      c.id, c.name, c.icon, c.vitality, c.vitality_updated_at,
      u.nickname as owner_name, u.phone as owner_phone,
      CASE 
        WHEN c.vitality_updated_at < NOW() - INTERVAL '30 days' THEN '归档预警'
        WHEN c.vitality_updated_at < NOW() - INTERVAL '14 days' THEN '休眠预警'
        WHEN c.vitality_updated_at < NOW() - INTERVAL '7 days' THEN '提醒'
        ELSE '正常'
      END as warning_level
    FROM clubs c
    JOIN users u ON c.owner_id = u.id
    WHERE c.club_type != 'default'
      AND c.status IN ('active', 'dormant')
      AND c.vitality_updated_at < NOW() - INTERVAL '7 days'
    ORDER BY c.vitality_updated_at ASC
    LIMIT 20
  `);

  return result.rows;
};

/**
 * 设置俱乐部自动批准规则
 */
export const setAutoApproveRules = async (rules: {
  min_game_players?: number;
  min_endorsements?: number;
}): Promise<void> => {
  // 这里可以存储到配置文件或数据库
  // 简化实现：仅记录日志
  logger.info('设置自动批准规则', rules);
};
