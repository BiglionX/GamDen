import { Router } from 'express';
import {
  createClubController,
  getClubListController,
  getClubDetailController,
  createPostController,
  getClubPostsController,
  createReplyController,
  deletePostController,
  getPostRepliesController
} from '../controllers/clubController';
import { authMiddleware } from '../middleware/authMiddleware';
import { deviceIdMiddleware } from '../middleware/deviceIdMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// 设备 ID 中间件（所有路由都需要）
router.use(deviceIdMiddleware);

// GET 类接口公开（游客可浏览）
router.use(optionalAuthMiddleware);
router.get('/list', getClubListController);
router.get('/:clubId', getClubDetailController);
router.get('/:clubId/posts', getClubPostsController);
router.get('/posts/:postId/replies', getPostRepliesController);

// POST 类接口需要完整认证
router.use(authMiddleware);
router.post('/create', createClubController);
router.post('/post', createPostController);
router.post('/reply', createReplyController);
router.delete('/posts/:postId', deletePostController);

export default router;
