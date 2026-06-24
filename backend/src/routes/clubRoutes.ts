import { Router } from 'express';
import {
  createClubController,
  getClubListController,
  getClubDetailController,
  createPostController,
  getClubPostsController,
  createReplyController,
  deletePostController,
  getPostRepliesController,
  // 俱乐部升级系统控制器
  getClubListExtendedController,
  joinClubController,
  leaveClubController,
  getClubMembersController,
  getUserClubsController,
  getRecommendedClubsController,
  checkClubMembershipController,
  autoJoinDefaultController,
  createProposalController,
  endorseProposalController,
  getProposalListController,
  getProposalDetailController,
  getVitalityRankingController
} from '../controllers/clubController';
import { authMiddleware } from '../middleware/authMiddleware';
import { deviceIdMiddleware } from '../middleware/deviceIdMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// 设备 ID 中间件（所有路由都需要）
router.use(deviceIdMiddleware);

// GET 类接口公开（游客可浏览）
router.use(optionalAuthMiddleware);

// 原有路由
router.get('/list', getClubListController);
router.get('/list/extended', getClubListExtendedController);
router.get('/:clubId', getClubDetailController);
router.get('/:clubId/posts', getClubPostsController);
router.get('/posts/:postId/replies', getPostRepliesController);
router.get('/:clubId/members', getClubMembersController);

// 用户相关（需认证）
router.get('/user/clubs', authMiddleware, getUserClubsController);
router.get('/user/recommended', authMiddleware, getRecommendedClubsController);
router.get('/user/membership/:clubId', authMiddleware, checkClubMembershipController);
router.post('/user/auto-join', authMiddleware, autoJoinDefaultController);

// 提议相关
router.get('/proposals', getProposalListController);
router.get('/proposals/:id', getProposalDetailController);
router.post('/proposals', authMiddleware, createProposalController);
router.post('/proposals/:id/endorse', authMiddleware, endorseProposalController);

// 活力值排行
router.get('/vitality/ranking', getVitalityRankingController);

// POST 类接口需要完整认证
router.use(authMiddleware);
router.post('/create', createClubController);
router.post('/post', createPostController);
router.post('/reply', createReplyController);
router.delete('/posts/:postId', deletePostController);

// 俱乐部加入/退出
router.post('/join/:clubId', joinClubController);
router.post('/leave/:clubId', leaveClubController);

export default router;
