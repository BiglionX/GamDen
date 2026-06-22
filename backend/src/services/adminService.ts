import { dbPool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * 获取用户列表
 */
export const getUsers = async (params: {
  page: number;
  limit: number;
  guardian_type?: string;
  level_min?: number;
  level_max?: number;
  status?: string;
  role?: string;
  register_start?: string;
  register_end?: string;
  keyword?: string;
}) => {
  const {
    page,
    limit,
    guardian_type,
    level_min,
    level_max,
    status,
    role,
    register_start,
    register_end,
    keyword
  } = params;
  
  const offset = (page - 1) * limit;
  
  let whereConditions = [];
  let queryParams: any[] = [];
  let paramIndex = 1;
  
  // 构建WHERE条件
  if (guardian_type) {
    whereConditions.push(`guardian_type = $${paramIndex}`);
    queryParams.push(guardian_type);
    paramIndex++;
  }
  
  if (level_min !== undefined) {
    whereConditions.push(`level >= $${paramIndex}`);
    queryParams.push(level_min);
    paramIndex++;
  }
  
  if (level_max !== undefined) {
    whereConditions.push(`level <= $${paramIndex}`);
    queryParams.push(level_max);
    paramIndex++;
  }
  
  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  
  if (role) {
    whereConditions.push(`role = $${paramIndex}`);
    queryParams.push(role);
    paramIndex++;
  }
  
  if (register_start) {
    whereConditions.push(`created_at >= $${paramIndex}`);
    queryParams.push(register_start);
    paramIndex++;
  }
  
  if (register_end) {
    whereConditions.push(`created_at <= $${paramIndex}`);
    queryParams.push(register_end);
    paramIndex++;
  }
  
  if (keyword) {
    whereConditions.push(`(id::text LIKE $${paramIndex} OR phone LIKE $${paramIndex} OR invite_code LIKE $${paramIndex})`);
    queryParams.push(`%${keyword}%`);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';
  
  // 查询总数
  const countResult = await dbPool!.query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total);
  
  // 查询列表
  queryParams.push(limit);
  queryParams.push(offset);
  
  const result = await dbPool!.query(
    `SELECT id, phone, guardian_type, level, exp, invite_code, 
            territory_coord_x, territory_coord_y, gold_coins, 
            role, status, last_login_at, created_at
     FROM users ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    queryParams
  );
  const rows = result.rows;
  
  // 脱敏处理手机号
  const maskedRows = rows.map(row => ({
    ...row,
    phone: row.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }));
  
  return {
    users: maskedRows,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * 冻结用户账号
 */
export const freezeUser = async (params: {
  userId: number;
  reason: string;
  duration: string;
  operatorId?: number;
}) => {
  const { userId, reason, duration, operatorId } = params;
  
  // 检查用户是否存在
  const userResult = await dbPool!.query(
    'SELECT id, status FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  // 更新用户状态为frozen
  await dbPool!.query(
    `UPDATE users SET status = 'frozen', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [userId]
  );
  
  // 记录操作日志
  await logOperation({
    operatorId,
    action: 'freeze_user',
    target: `user_id:${userId}`,
    reason,
    oldValue: 'active',
    newValue: 'frozen'
  });
  
  return { user_id: userId, status: 'frozen' };
};

/**
 * 解冻用户账号
 */
export const unfreezeUser = async (params: {
  userId: number;
  reason: string;
  operatorId?: number;
}) => {
  const { userId, reason, operatorId } = params;
  
  // 检查用户是否存在
  const userResult = await dbPool!.query(
    'SELECT id, status FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  // 更新用户状态为active
  await dbPool!.query(
    `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [userId]
  );
  
  // 记录操作日志
  await logOperation({
    operatorId,
    action: 'unfreeze_user',
    target: `user_id:${userId}`,
    reason,
    oldValue: 'frozen',
    newValue: 'active'
  });
  
  return { user_id: userId, status: 'active' };
};

/**
 * 手动调整用户坐标
 */
export const adjustUserCoord = async (params: {
  userId: number;
  newCoordX: number;
  newCoordY: number;
  reason: string;
  operatorId?: number;
}) => {
  const { userId, newCoordX, newCoordY, reason, operatorId } = params;
  
  // 检查用户是否存在
  const userResult = await dbPool!.query(
    'SELECT id, territory_coord_x, territory_coord_y FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const oldCoordX = userResult.rows[0].territory_coord_x;
  const oldCoordY = userResult.rows[0].territory_coord_y;
  
  // 检查新坐标是否已被占用
  const coordCheck = await dbPool!.query(
    'SELECT id FROM users WHERE territory_coord_x = $1 AND territory_coord_y = $2 AND id != $3',
    [newCoordX, newCoordY, userId]
  );
  
  if (coordCheck.rows.length > 0) {
    throw new Error('坐标已被占用');
  }
  
  // 更新用户坐标
  await dbPool!.query(
    `UPDATE users SET territory_coord_x = $1, territory_coord_y = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [newCoordX, newCoordY, userId]
  );
  
  // 记录操作日志
  await logOperation({
    operatorId,
    action: 'adjust_coord',
    target: `user_id:${userId}`,
    reason,
    oldValue: `(${oldCoordX}, ${oldCoordY})`,
    newValue: `(${newCoordX}, ${newCoordY})`
  });
  
  return {
    user_id: userId,
    old_coord: { x: oldCoordX, y: oldCoordY },
    new_coord: { x: newCoordX, y: newCoordY }
  };
};

/**
 * 获取内容审核列表
 */
export const getContentAuditList = async (params: {
  page: number;
  limit: number;
  content_type?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
}) => {
  const {
    page,
    limit,
    content_type,
    status,
    start_time,
    end_time
  } = params;
  
  const offset = (page - 1) * limit;
  
  let whereConditions = [];
  let queryParams: any[] = [];
  let paramIndex = 1;
  
  if (content_type) {
    whereConditions.push(`content_type = $${paramIndex}`);
    queryParams.push(content_type);
    paramIndex++;
  }
  
  if (status) {
    whereConditions.push(`manual_result = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  
  if (start_time) {
    whereConditions.push(`created_at >= $${paramIndex}`);
    queryParams.push(start_time);
    paramIndex++;
  }
  
  if (end_time) {
    whereConditions.push(`created_at <= $${paramIndex}`);
    queryParams.push(end_time);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';
  
  // 查询总数
  const countResult = await dbPool!.query(
    `SELECT COUNT(*) as total FROM content_audit_logs ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total);
  
  // 查询列表
  queryParams.push(limit);
  queryParams.push(offset);
  
  const result = await dbPool!.query(
    `SELECT * FROM content_audit_logs ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    queryParams
  );
  const rows = result.rows;
  
  return {
    audit_logs: rows,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * 审核通过内容
 */
export const approveContent = async (params: {
  contentType: string;
  contentId: number;
  auditorId?: number;
}) => {
  const { contentType, contentId, auditorId } = params;
  
  // 根据内容类型更新对应表的状态
  if (contentType === 'post') {
    await dbPool!.query(
      `UPDATE club_posts SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [contentId]
    );
  } else if (contentType === 'signature') {
    // 签名不需要审核，直接通过
  }
  
  // 更新审核日志
  await dbPool!.query(
    `UPDATE content_audit_logs 
     SET manual_result = 'approved', auditor_id = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE content_type = $2 AND content_id = $3`,
    [auditorId, contentType, contentId]
  );
  
  // 记录操作日志
  await logOperation({
    operatorId: auditorId,
    action: 'approve_content',
    target: `${contentType}:${contentId}`,
    reason: '审核通过',
    oldValue: 'pending',
    newValue: 'approved'
  });
  
  return { content_type: contentType, content_id: contentId, status: 'approved' };
};

/**
 * 审核拒绝内容
 */
export const rejectContent = async (params: {
  contentType: string;
  contentId: number;
  reason: string;
  auditorId?: number;
}) => {
  const { contentType, contentId, reason, auditorId } = params;
  
  // 根据内容类型更新对应表的状态
  if (contentType === 'post') {
    await dbPool!.query(
      `UPDATE club_posts SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [contentId]
    );
  }
  
  // 更新审核日志
  await dbPool!.query(
    `UPDATE content_audit_logs 
     SET manual_result = 'rejected', auditor_id = $1, audit_reason = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE content_type = $3 AND content_id = $4`,
    [auditorId, reason, contentType, contentId]
  );
  
  // 记录违规次数
  const contentResult = await dbPool!.query(
    `SELECT user_id FROM content_audit_logs 
     WHERE content_type = $1 AND content_id = $2`,
    [contentType, contentId]
  );
  
  if (contentResult.rows.length > 0) {
    const userId = contentResult.rows[0].user_id;
    await recordViolation(userId, contentType);
  }
  
  // 记录操作日志
  await logOperation({
    operatorId: auditorId,
    action: 'reject_content',
    target: `${contentType}:${contentId}`,
    reason,
    oldValue: 'pending',
    newValue: 'rejected'
  });
  
  return { content_type: contentType, content_id: contentId, status: 'rejected' };
};

/**
 * 记录用户违规次数
 */
const recordViolation = async (userId: number, violationType: string) => {
  // 检查是否已有违规记录
  const violationResult = await dbPool!.query(
    'SELECT * FROM user_violations WHERE user_id = $1 AND violation_type = $2',
    [userId, violationType]
  );
  
  if (violationResult.rows.length > 0) {
    // 更新违规次数
    await dbPool!.query(
      `UPDATE user_violations 
       SET violation_count = violation_count + 1, last_violation_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND violation_type = $2`,
      [userId, violationType]
    );
  } else {
    // 插入新记录
    await dbPool!.query(
      `INSERT INTO user_violations (user_id, violation_type, violation_count) 
       VALUES ($1, $2, 1)`,
      [userId, violationType]
    );
  }
  
  // 检查是否需要执行梯度处罚
  const updatedViolation = await dbPool!.query(
    'SELECT violation_count FROM user_violations WHERE user_id = $1 AND violation_type = $2',
    [userId, violationType]
  );
  
  const violationCount = updatedViolation.rows[0].violation_count;
  
  // 梯度处罚
  if (violationCount === 1) {
    // 第一次：警告
    console.log(`用户${userId} 第一次违规，发送警告`);
    // 发送Agent警告通知
    try {
      const { sendAgentMessage } = require('./agentService');
      await sendAgentMessage(userId, 'defend_fail'); // 复用防御失败话术作为警告
    } catch (e) {
      console.error('发送警告通知失败:', e);
    }
  } else if (violationCount === 2) {
    // 第二次：禁言24小时
    console.log(`用户${userId} 第二次违规，禁言24小时`);
    await dbPool!.query(
      `UPDATE users SET muted_until = NOW() + INTERVAL '24 hours' WHERE id = $1`,
      [userId]
    );
  } else if (violationCount >= 3) {
    // 第三次：冻结账号
    await freezeUser({
      userId,
      reason: `违规次数达到${violationCount}次`,
      duration: 'permanent',
      operatorId: 1 // 系统操作
    });
  }
};

/**
 * 添加敏感词
 */
export const addSensitiveWord = async (params: {
  word: string;
  category: string;
  level: string;
}) => {
  const { word, category, level } = params;
  
  try {
    const result = await dbPool!.query(
      `INSERT INTO sensitive_words (word, category, level) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [word, category, level]
    );
    
    return result.rows[0];
  } catch (error: any) {
    if (error.message.includes('unique constraint')) {
      throw new Error('敏感词已存在');
    }
    throw error;
  }
};

/**
 * 删除敏感词
 */
export const deleteSensitiveWord = async (wordId: number) => {
  const result = await dbPool!.query(
    'DELETE FROM sensitive_words WHERE id = $1 RETURNING *',
    [wordId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('敏感词不存在');
  }
  
  return { id: wordId, deleted: true };
};

/**
 * 更新野兽潮配置
 */
export const updateBeastConfig = async (params: {
  checkInterval?: number;
  triggerProbability?: number;
  minLevel?: number;
  maxLevel?: number;
  affectRange?: number;
  defenseFailProbability?: number;
  operatorId?: number;
}) => {
  const {
    checkInterval,
    triggerProbability,
    minLevel,
    maxLevel,
    affectRange,
    defenseFailProbability,
    operatorId
  } = params;
  
  // 构建更新字段
  let updateFields = [];
  let queryParams: any[] = [];
  let paramIndex = 1;
  
  if (checkInterval !== undefined) {
    updateFields.push(`check_interval = $${paramIndex}`);
    queryParams.push(checkInterval);
    paramIndex++;
  }
  
  if (triggerProbability !== undefined) {
    updateFields.push(`trigger_probability = $${paramIndex}`);
    queryParams.push(triggerProbability);
    paramIndex++;
  }
  
  if (minLevel !== undefined) {
    updateFields.push(`min_level = $${paramIndex}`);
    queryParams.push(minLevel);
    paramIndex++;
  }
  
  if (maxLevel !== undefined) {
    updateFields.push(`max_level = $${paramIndex}`);
    queryParams.push(maxLevel);
    paramIndex++;
  }
  
  if (affectRange !== undefined) {
    updateFields.push(`affect_range = $${paramIndex}`);
    queryParams.push(affectRange);
    paramIndex++;
  }
  
  if (defenseFailProbability !== undefined) {
    updateFields.push(`defense_fail_probability = $${paramIndex}`);
    queryParams.push(defenseFailProbability);
    paramIndex++;
  }
  
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateFields.push(`updated_by = $${paramIndex}`);
  queryParams.push(operatorId);
  
  // 更新配置
  const result = await dbPool!.query(
    `UPDATE beast_config SET ${updateFields.join(', ')} WHERE id = 1 RETURNING *`,
    queryParams
  );
  
  // 记录操作日志
  await logOperation({
    operatorId,
    action: 'update_beast_config',
    target: 'beast_config',
    reason: '更新野兽潮配置',
    oldValue: '',
    newValue: JSON.stringify(params)
  });
  
  return result.rows[0];
};

/**
 * 更新金币规则配置
 */
export const updateGoldConfig = async (params: {
  configKey: string;
  configValue: number;
  operatorId?: number;
}) => {
  const { configKey, configValue, operatorId } = params;
  
  // 检查配置项是否存在
  const configResult = await dbPool!.query(
    'SELECT * FROM gold_config WHERE config_key = $1',
    [configKey]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('配置项不存在');
  }
  
  const oldValue = configResult.rows[0].config_value;
  
  // 更新配置
  const result = await dbPool!.query(
    `UPDATE gold_config 
     SET config_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 
     WHERE config_key = $3 
     RETURNING *`,
    [configValue, operatorId, configKey]
  );
  
  // 记录操作日志
  await logOperation({
    operatorId,
    action: 'update_gold_config',
    target: configKey,
    reason: '更新金币规则配置',
    oldValue: oldValue.toString(),
    newValue: configValue.toString()
  });
  
  return result.rows[0];
};

/**
 * 获取数据看板
 */
export const getDashboardData = async (params: {
  startDate?: string;
  endDate?: string;
}) => {
  const { startDate, endDate } = params;
  
  // 默认查询近30天
  const startDateObj = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDateObj = endDate ? new Date(endDate) : new Date();
  
  const startDateStr = startDateObj.toISOString().split('T')[0];
  const endDateStr = endDateObj.toISOString().split('T')[0];
  
  // DAU（日活跃用户）
  const dauResult = await dbPool!.query(
    `SELECT COUNT(DISTINCT id) as dau 
     FROM users 
     WHERE last_login_at >= $1 AND last_login_at <= $2`,
    [`${startDateStr} 00:00:00`, `${endDateStr} 23:59:59`]
  );
  const dau = parseInt(dauResult.rows[0].dau);
  
  // 新增用户
  const newUsersResult = await dbPool!.query(
    `SELECT COUNT(*) as new_users 
     FROM users 
     WHERE created_at >= $1 AND created_at <= $2`,
    [`${startDateStr} 00:00:00`, `${endDateStr} 23:59:59`]
  );
  const newUsers = parseInt(newUsersResult.rows[0].new_users);
  
  // 领地等级分布
  const levelDistResult = await dbPool!.query(
    `SELECT level, COUNT(*) as count 
     FROM users 
     GROUP BY level 
     ORDER BY level`
  );
  const levelDistribution = levelDistResult.rows;
  
  // 金币流通量
  const goldResult = await dbPool!.query(
    'SELECT SUM(gold_coins) as total_gold FROM users'
  );
  const totalGold = parseInt(goldResult.rows[0].total_gold) || 0;
  
  // 俱乐部数量
  const clubResult = await dbPool!.query(
    'SELECT COUNT(*) as total_clubs FROM clubs WHERE status = \'active\''
  );
  const totalClubs = parseInt(clubResult.rows[0].total_clubs);
  
  // 帖子数量
  const postResult = await dbPool!.query(
    'SELECT COUNT(*) as total_posts FROM club_posts WHERE status = \'approved\''
  );
  const totalPosts = parseInt(postResult.rows[0].total_posts);
  
  return {
    dau,
    new_users: newUsers,
    level_distribution: levelDistribution,
    total_gold: totalGold,
    total_clubs: totalClubs,
    total_posts: totalPosts,
    date_range: {
      start_date: startDateStr,
      end_date: endDateStr
    }
  };
};

/**
 * 记录操作日志（辅助函数）
 */
const logOperation = async (params: {
  operatorId?: number;
  action: string;
  target: string;
  reason: string;
  oldValue: string;
  newValue: string;
}) => {
  try {
    await dbPool!.query(
      `INSERT INTO operation_logs (operator_id, action, target, reason, old_value, new_value) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.operatorId || null,
        params.action,
        params.target,
        params.reason,
        params.oldValue,
        params.newValue
      ]
    );
  } catch (error: any) {
    console.error('记录操作日志失败:', error.message);
  }
};
