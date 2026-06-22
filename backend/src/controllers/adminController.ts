import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import {
  getUsers,
  freezeUser,
  unfreezeUser,
  adjustUserCoord,
  getContentAuditList,
  approveContent,
  rejectContent,
  addSensitiveWord,
  deleteSensitiveWord,
  updateBeastConfig,
  updateGoldConfig,
  getDashboardData
} from '../services/adminService';
import { AppError } from '../middleware/errorHandler';
import { logAdminOperation } from '../middleware/adminAuth';

/**
 * 获取用户列表
 */
export const getUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '20',
      guardian_type,
      level_min,
      level_max,
      status,
      role,
      register_start,
      register_end,
      keyword
    } = req.query;
    
    const result = await getUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      guardian_type: guardian_type as string,
      level_min: level_min ? parseInt(level_min as string) : undefined,
      level_max: level_max ? parseInt(level_max as string) : undefined,
      status: status as string,
      role: role as string,
      register_start: register_start as string,
      register_end: register_end as string,
      keyword: keyword as string
    });
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 冻结用户账号
 */
export const freezeUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id, reason, duration } = req.body;
    const operatorId = (req as any).user?.userId;
    
    if (!user_id || !reason || !duration) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await freezeUser({
      userId: user_id,
      reason,
      duration,
      operatorId
    });
    
    res.status(200).json({
      code: 200,
      message: '账号已冻结',
      data: result
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 解冻用户账号
 */
export const unfreezeUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id, reason } = req.body;
    const operatorId = (req as any).user?.userId;
    
    if (!user_id || !reason) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await unfreezeUser({
      userId: user_id,
      reason,
      operatorId
    });
    
    res.status(200).json({
      code: 200,
      message: '账号已解冻',
      data: result
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 手动调整用户坐标
 */
export const adjustCoordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id, new_coord_x, new_coord_y, reason } = req.body;
    const operatorId = (req as any).user?.userId;
    
    if (!user_id || new_coord_x === undefined || new_coord_y === undefined || !reason) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    // 验证坐标范围
    if (new_coord_x < -1000 || new_coord_x > 1000 || new_coord_y < -1000 || new_coord_y > 1000) {
      throw new AppError('坐标超出范围（-1000~+1000）', 400, 400);
    }
    
    const result = await adjustUserCoord({
      userId: user_id,
      newCoordX: new_coord_x,
      newCoordY: new_coord_y,
      reason,
      operatorId
    });
    
    res.status(200).json({
      code: 200,
      message: '坐标调整成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else if (error.message === '坐标已被占用') {
      next(new AppError(error.message, 409, 1005));
    } else {
      next(error);
    }
  }
};

/**
 * 获取内容审核列表
 */
export const getContentAuditListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '20',
      content_type,
      status,
      start_time,
      end_time
    } = req.query;
    
    const result = await getContentAuditList({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      content_type: content_type as string,
      status: status as string,
      start_time: start_time as string,
      end_time: end_time as string
    });
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 审核通过内容
 */
export const approveContentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content_type, content_id } = req.body;
    const auditorId = (req as any).user?.userId;
    
    if (!content_type || !content_id) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await approveContent({
      contentType: content_type,
      contentId: content_id,
      auditorId
    });
    
    res.status(200).json({
      code: 200,
      message: '审核通过',
      data: result
    });
  } catch (error: any) {
    if (error.message === '内容不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 审核拒绝内容
 */
export const rejectContentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content_type, content_id, reason } = req.body;
    const auditorId = (req as any).user?.userId;
    
    if (!content_type || !content_id || !reason) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await rejectContent({
      contentType: content_type,
      contentId: content_id,
      reason,
      auditorId
    });
    
    res.status(200).json({
      code: 200,
      message: '审核拒绝',
      data: result
    });
  } catch (error: any) {
    if (error.message === '内容不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 添加敏感词
 */
export const addSensitiveWordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { word, category, level } = req.body;
    
    if (!word || !category || !level) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await addSensitiveWord({ word, category, level });
    
    res.status(200).json({
      code: 200,
      message: '添加成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '敏感词已存在') {
      next(new AppError(error.message, 409, 409));
    } else {
      next(error);
    }
  }
};

/**
 * 删除敏感词
 */
export const deleteSensitiveWordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { word_id } = req.params;
    
    if (!word_id) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await deleteSensitiveWord(parseInt(word_id));
    
    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '敏感词不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 获取野兽潮配置
 */
export const getBeastConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await dbPool!.query('SELECT * FROM beast_config WHERE id = 1');
    const rows = result.rows;
    
    if (rows.length === 0) {
      throw new AppError('配置不存在', 404, 404);
    }
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新野兽潮配置
 */
export const updateBeastConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      check_interval,
      trigger_probability,
      min_level,
      max_level,
      affect_range,
      defense_fail_probability
    } = req.body;
    
    const operatorId = (req as any).user?.userId;
    
    const result = await updateBeastConfig({
      checkInterval: check_interval,
      triggerProbability: trigger_probability,
      minLevel: min_level,
      maxLevel: max_level,
      affectRange: affect_range,
      defenseFailProbability: defense_fail_probability,
      operatorId
    });
    
    res.status(200).json({
      code: 200,
      message: '配置更新成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取金币规则配置
 */
export const getGoldConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await dbPool!.query('SELECT * FROM gold_config ORDER BY id');
    const rows = result.rows;
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新金币规则配置
 */
export const updateGoldConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { config_key, config_value } = req.body;
    const operatorId = (req as any).user?.userId;
    
    if (!config_key || config_value === undefined) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await updateGoldConfig({
      configKey: config_key,
      configValue: config_value,
      operatorId
    });
    
    res.status(200).json({
      code: 200,
      message: '配置更新成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '配置项不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 获取数据看板
 */
export const getDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { start_date, end_date } = req.query;
    
    const result = await getDashboardData({
      startDate: start_date as string || '30 days ago',
      endDate: end_date as string || 'today'
    });
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取操作日志
 */
export const getOperationLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '20',
      operator_id,
      action,
      start_time,
      end_time
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (operator_id) {
      whereConditions.push(`operator_id = $${paramIndex}`);
      queryParams.push(parseInt(operator_id as string));
      paramIndex++;
    }
    
    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      queryParams.push(action);
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
      `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);
    
    // 查询列表
    queryParams.push(parseInt(limit as string));
    queryParams.push(offset);
    
    const result = await dbPool!.query(
      `SELECT * FROM operation_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );
    const rows = result.rows;
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        logs: rows,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total_pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
