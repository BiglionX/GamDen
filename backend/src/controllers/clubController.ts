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
  getPostReplies
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
