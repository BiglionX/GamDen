import { Router } from 'express';
import {
  getGoldCoinsController,
  signInController,
  exchangeAvatarFrameController,
  exchangeChatBubbleController,
  exchangeSpecialSignatureController,
  getGoldTransactionsController
} from '../controllers/shopController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 所有商城相关接口都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/shop/gold
 * @desc    获取金币余额
 * @access  Private
 */
router.get('/gold', getGoldCoinsController);

/**
 * @route   POST /api/shop/sign-in
 * @desc    签到
 * @access  Private
 */
router.post('/sign-in', signInController);

/**
 * @route   POST /api/shop/exchange/avatar-frame
 * @desc    兑换头像框
 * @access  Private
 */
router.post('/exchange/avatar-frame', exchangeAvatarFrameController);

/**
 * @route   POST /api/shop/exchange/chat-bubble
 * @desc    兑换聊天气泡
 * @access  Private
 */
router.post('/exchange/chat-bubble', exchangeChatBubbleController);

/**
 * @route   POST /api/shop/exchange/special-signature
 * @desc    兑换特殊签名
 * @access  Private
 */
router.post('/exchange/special-signature', exchangeSpecialSignatureController);

/**
 * @route   GET /api/shop/transactions
 * @desc    获取金币流水
 * @access  Private
 */
router.get('/transactions', getGoldTransactionsController);

export default router;
