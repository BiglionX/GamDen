import { Router } from 'express';
import {
  createClubController,
  getClubListController,
  getClubDetailController,
  createPostController,
  getClubPostsController,
  createReplyController
} from '../controllers/clubController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 所有俱乐部相关接口都需要认证
router.use(authMiddleware);

/**
 * @route   POST /api/club/create
 * @desc    创建俱乐部
 * @access  Private
 */
router.post('/create', createClubController);

/**
 * @route   GET /api/club/list
 * @desc    获取俱乐部列表
 * @access  Private
 */
router.get('/list', getClubListController);

/**
 * @route   GET /api/club/:clubId
 * @desc    获取俱乐部详情
 * @access  Private
 */
router.get('/:clubId', getClubDetailController);

/**
 * @route   POST /api/club/post
 * @desc    在俱乐部发帖
 * @access  Private
 */
router.post('/post', createPostController);

/**
 * @route   GET /api/club/:clubId/posts
 * @desc    获取俱乐部帖子列表
 * @access  Private
 */
router.get('/:clubId/posts', getClubPostsController);

/**
 * @route   POST /api/club/reply
 * @desc    回复帖子
 * @access  Private
 */
router.post('/reply', createReplyController);

export default router;
