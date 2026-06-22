import { Router } from 'express';
import {
  getInviteCodeController,
  getInviteProgressController,
  shareInviteCodeController
} from '../controllers/inviteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 所有邀请相关接口都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/invite/code
 * @desc    获取邀请码
 * @access  Private
 */
router.get('/code', getInviteCodeController);

/**
 * @route   GET /api/invite/progress
 * @desc    查看邀请进度
 * @access  Private
 */
router.get('/progress', getInviteProgressController);

/**
 * @route   GET /api/invite/share
 * @desc    获取分享链接
 * @access  Private
 */
router.get('/share', shareInviteCodeController);

export default router;
