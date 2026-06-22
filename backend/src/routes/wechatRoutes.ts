import { Router } from 'express';
import {
  wechatMiniProgramLoginController,
  checkMiniProgramUnlockController,
  generateMiniProgramQRCodeController,
  triggerAutoGenerateMiniProgram
} from '../controllers/wechatController';

const router = Router();

/**
 * @route   POST /api/wechat/miniprogram-login
 * @desc    微信小程序登录
 * @access  Public
 */
router.post('/miniprogram-login', wechatMiniProgramLoginController);

/**
 * @route   GET /api/wechat/miniprogram-unlock
 * @desc    检查小程序解锁状态
 * @access  Private
 */
router.get('/miniprogram-unlock', checkMiniProgramUnlockController);

/**
 * @route   POST /api/wechat/generate-miniprogram
 * @desc    生成小程序码
 * @access  Private
 */
router.post('/generate-miniprogram', generateMiniProgramQRCodeController);

/**
 * @route   POST /api/wechat/auto-generate
 * @desc    自动生成小程序（供邀请服务调用）
 * @access  Private
 */
router.post('/auto-generate', triggerAutoGenerateMiniProgram);

export default router;
