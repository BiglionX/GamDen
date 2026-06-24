/**
 * 俱乐部后台管理控制器
 */

import { Request, Response, NextFunction } from 'express';
import {
  getClubListAdmin,
  getClubDetailAdmin,
  updateClubAdmin,
  updateClubStatus,
  deleteClub,
  getProposalReviewList,
  reviewProposalAdmin,
  batchReviewProposals,
  getVitalityStats,
  getVitalityTrend,
  getVitalityTopClubs,
  getLowVitalityWarnings
} from '../services/clubAdminService';
import { AppError } from '../middleware/errorHandler';

/**
 * 获取俱乐部列表（管理后台）
 */
export const getClubListAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const club_type = req.query.club_type as string;
    const status = req.query.status as string;
    const vitality_level = req.query.vitality_level as string;
    const keyword = req.query.keyword as string;
    const sort_by = req.query.sort_by as string;
    const sort_order = req.query.sort_order as string;

    const result = await getClubListAdmin({
      page,
      limit,
      club_type,
      status,
      vitality_level,
      keyword,
      sort_by,
      sort_order
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
 * 获取俱乐部详情（管理后台）
 */
export const getClubDetailAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.id);

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    const club = await getClubDetailAdmin(clubId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: club
    });
  } catch (error: any) {
    if (error.message === '俱乐部不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 更新俱乐部信息（管理后台）
 */
export const updateClubAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.id);
    const { name, description, tags, join_type, icon } = req.body;

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    await updateClubAdmin(clubId, { name, description, tags, join_type, icon });

    res.status(200).json({
      code: 200,
      message: '更新成功'
    });
  } catch (error: any) {
    if (error.message === '俱乐部名称已存在') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 更新俱乐部状态
 */
export const updateClubStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    if (!['active', 'dormant', 'archived', 'closed'].includes(status)) {
      throw new AppError('无效的状态值', 400, 400);
    }

    await updateClubStatus(clubId, status);

    res.status(200).json({
      code: 200,
      message: '状态更新成功'
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('不可')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 删除俱乐部
 */
export const deleteClubController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.id);

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    await deleteClub(clubId);

    res.status(200).json({
      code: 200,
      message: '删除成功'
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('不可删除')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取提议审核列表
 */
export const getProposalReviewListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const proposal_type = req.query.proposal_type as string;

    const result = await getProposalReviewList({
      page,
      limit,
      status,
      proposal_type
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
 * 审核提议
 */
export const reviewProposalAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { action, comment } = req.body;
    const reviewerId = (req as any).user?.userId;

    if (isNaN(proposalId)) {
      throw new AppError('提议ID无效', 400, 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('无效的操作', 400, 400);
    }

    const result = await reviewProposalAdmin(proposalId, action, reviewerId, comment);

    res.status(200).json({
      code: 200,
      message: action === 'approve' ? '已批准' : '已驳回',
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('已审核')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 批量审核提议
 */
export const batchReviewProposalsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { proposal_ids, action, comment } = req.body;
    const reviewerId = (req as any).user?.userId;

    if (!Array.isArray(proposal_ids) || proposal_ids.length === 0) {
      throw new AppError('请选择要审核的提议', 400, 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('无效的操作', 400, 400);
    }

    const result = await batchReviewProposals(proposal_ids, action, reviewerId);

    res.status(200).json({
      code: 200,
      message: `处理完成：成功 ${result.success}，失败 ${result.failed}`,
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('选择')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取活力值统计
 */
export const getVitalityStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getVitalityStats();

    res.status(200).json({
      code: 200,
      message: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取活力值趋势
 */
export const getVitalityTrendController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    if (days < 1 || days > 90) {
      throw new AppError('天数范围应为1-90', 400, 400);
    }

    const trend = await getVitalityTrend(days);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: trend
    });
  } catch (error: any) {
    if (error.message.includes('天数')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取活力值TOP俱乐部
 */
export const getVitalityTopClubsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const clubs = await getVitalityTopClubs(limit);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: clubs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取低活力预警
 */
export const getLowVitalityWarningsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const warnings = await getLowVitalityWarnings();

    res.status(200).json({
      code: 200,
      message: 'success',
      data: warnings
    });
  } catch (error) {
    next(error);
  }
};
