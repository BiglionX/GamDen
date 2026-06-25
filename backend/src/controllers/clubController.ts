import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';
import {
  createClub,
  getClubList,
  getClubDetail,
  createPost,
  getClubPosts,
  createReply,
  deletePost,
  getPostReplies,
  getClubListExtended,
  joinClub,
  leaveClub,
  getClubMembers,
  getUserClubs,
  isClubMember,
  autoJoinDefaultClub,
  getRecommendedClubs,
  createProposal,
  endorseProposal,
  getProposalList,
  getProposalDetail,
  getVitalityRanking
} from '../services/clubService';
import { AppError } from '../middleware/errorHandler';

/**
 * 创建俱乐部
 */
export const createClubController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { name, game_name, description } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    // 参数验证
    if (!name || !game_name) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    // 检查用户等级（需要Lv.2以上）
    const userResult: any = await dbPool!.query(
      'SELECT level FROM users WHERE id = $1',
      [userId]
    );
    
    const userRows = userResult.rows;
    if (userRows.length === 0 || userRows[0].level < 2) {
      throw new AppError('需要Lv.2以上才能创建俱乐部', 403, 403);
    }
    
    const result = await createClub({
      name,
      game_name,
      description,
      owner_id: userId
    });
    
    res.status(200).json({
      code: 200,
      message: '创建成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '俱乐部名称已存在') {
      next(new AppError(error.message, 409, 409));
    } else {
      next(error);
    }
  }
};

/**
 * 获取俱乐部列表
 */
export const getClubListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const game_name = req.query.game_name as string;
    
    const result = await getClubList(page, limit, game_name);
    
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
 * 获取俱乐部详情
 */
export const getClubDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    
    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }
    
    const club = await getClubDetail(clubId);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: club
    });
  } catch (error: any) {
    if (error.message === '俱乐部不存在或已关闭') {
      next(new AppError(error.message, 404, 1007));
    } else {
      next(error);
    }
  }
};

/**
 * 在俱乐部发帖
 */
export const createPostController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { club_id, content } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!club_id || !content) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await createPost({
      club_id,
      user_id: userId,
      content
    });
    
    res.status(200).json({
      code: 200,
      message: '发帖成功，待审核',
      data: result
    });
  } catch (error: any) {
    if (error.message === '俱乐部不存在或已关闭') {
      next(new AppError(error.message, 404, 1007));
    } else if (error.message === '帖子内容不能超过500字') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取俱乐部帖子列表
 */
export const getClubPostsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }
    
    const result = await getClubPosts(clubId, page, limit);
    
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
 * 回复帖子
 */
export const createReplyController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { post_id, content } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!post_id || !content) {
      throw new AppError('参数不完整', 400, 400);
    }
    
    const result = await createReply({
      post_id,
      user_id: userId,
      content
    });
    
    res.status(200).json({
      code: 200,
      message: '回复成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '帖子不存在或未通过审核') {
      next(new AppError(error.message, 404, 404));
    } else if (error.message === '回复内容不能超过200字') {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 删除帖子
 */
export const deletePostController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role || 'player';
    const postId = parseInt(req.params.postId);

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (isNaN(postId)) {
      throw new AppError('帖子ID无效', 400, 400);
    }

    await deletePost({
      post_id: postId,
      user_id: userId,
      user_role: userRole
    });

    res.status(200).json({
      code: 200,
      message: '帖子已删除'
    });
  } catch (error: any) {
    if (error.message === '帖子不存在') {
      next(new AppError(error.message, 404, 404));
    } else if (error.message === '无权限删除此帖子') {
      next(new AppError(error.message, 403, 403));
    } else {
      next(error);
    }
  }
};

/**
 * 获取帖子回复列表
 */
export const getPostRepliesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const postId = parseInt(req.params.postId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(postId)) {
      throw new AppError('帖子ID无效', 400, 400);
    }

    const result = await getPostReplies(postId, page, limit);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// 俱乐部升级系统接口
// ============================================

/**
 * 获取俱乐部列表（扩展版）
 */
export const getClubListExtendedController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const club_type = req.query.club_type as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const keyword = req.query.keyword as string;
    const vitality_level = req.query.vitality_level as string;
    const sort_by = req.query.sort_by as string;
    const sort_order = req.query.sort_order as string;

    const result = await getClubListExtended({
      page,
      limit,
      club_type,
      tags,
      keyword,
      vitality_level,
      sort_by: sort_by as any,
      sort_order: sort_order as any
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
 * 加入俱乐部
 */
export const joinClubController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const clubId = parseInt(req.params.clubId);

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    const result = await joinClub(clubId, userId);

    res.status(200).json({
      code: 200,
      message: result.message,
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('已关闭') || error.message.includes('不支持')) {
      next(new AppError(error.message, 400, 400));
    } else if (error.message.includes('已是')) {
      res.status(200).json({ code: 200, message: error.message });
    } else {
      next(error);
    }
  }
};

/**
 * 退出俱乐部
 */
export const leaveClubController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const clubId = parseInt(req.params.clubId);

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    const result = await leaveClub(clubId, userId);

    res.status(200).json({
      code: 200,
      message: result.message,
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('不可') || error.message.includes('不是')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取俱乐部成员列表
 */
export const getClubMembersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    const result = await getClubMembers(clubId, page, limit);

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
 * 获取用户已加入的俱乐部列表
 */
export const getUserClubsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const clubs = await getUserClubs(userId);

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
 * 获取推荐俱乐部
 */
export const getRecommendedClubsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const clubs = await getRecommendedClubs(userId, limit);

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
 * 检查用户是否是俱乐部成员
 */
export const checkClubMembershipController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const clubId = parseInt(req.params.clubId);

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (isNaN(clubId)) {
      throw new AppError('俱乐部ID无效', 400, 400);
    }

    const isMember = await isClubMember(clubId, userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: { is_member: isMember }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 自动加入默认俱乐部（新用户入驻）
 */
export const autoJoinDefaultController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    const result = await autoJoinDefaultClub(userId);

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
 * 创建俱乐部提议
 */
export const createProposalController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { name, description, proposal_type, game_name, tags } = req.body;

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (!name || !description) {
      throw new AppError('参数不完整', 400, 400);
    }

    if (name.length > 15) {
      throw new AppError('俱乐部名称不能超过15字', 400, 400);
    }

    if (description.length > 50) {
      throw new AppError('简介不能超过50字', 400, 400);
    }

    const result = await createProposal({
      proposer_id: userId,
      name,
      description,
      proposal_type,
      game_name,
      tags: tags || []
    });

    res.status(200).json({
      code: 200,
      message: '提议提交成功',
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('已存在') || error.message.includes('敏感词')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 联署提议
 */
export const endorseProposalController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const proposalId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }

    if (isNaN(proposalId)) {
      throw new AppError('提议ID无效', 400, 400);
    }

    const result = await endorseProposal(proposalId, userId);

    let message = '联署成功';
    if (result.auto_approved) {
      message = '联署成功！提议已达成20人联署，自动批准';
    }

    res.status(200).json({
      code: 200,
      message,
      data: result
    });
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('已审核') || error.message.includes('已过期')) {
      next(new AppError(error.message, 400, 400));
    } else {
      next(error);
    }
  }
};

/**
 * 获取提议列表
 */
export const getProposalListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const proposal_type = req.query.proposal_type as string;
    const user_id = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;

    const result = await getProposalList({
      page,
      limit,
      status,
      proposal_type,
      user_id
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
 * 获取提议详情
 */
export const getProposalDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const proposalId = parseInt(req.params.id);

    if (isNaN(proposalId)) {
      throw new AppError('提议ID无效', 400, 400);
    }

    const proposal = await getProposalDetail(proposalId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: proposal
    });
  } catch (error: any) {
    if (error.message === '提议不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 获取活力值排行榜
 */
export const getVitalityRankingController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const ranking = await getVitalityRanking(limit);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: ranking
    });
  } catch (error) {
    next(error);
  }
};
