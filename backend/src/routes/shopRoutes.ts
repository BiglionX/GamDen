import { Router } from 'express';
import {
  getGoldCoinsController,
  signInController,
  exchangeAvatarFrameController,
  exchangeChatBubbleController,
  exchangeSpecialSignatureController,
  getGoldTransactionsController,
  getItemListController,
  getMyItemsController
} from '../controllers/shopController';
import { authMiddleware } from '../middleware/authMiddleware';
import { deviceIdMiddleware } from '../middleware/deviceIdMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// 设备 ID 中间件（所有路由都需要）
router.use(deviceIdMiddleware);

// GET 类接口公开（游客可浏览道具列表）
router.use(optionalAuthMiddleware);
router.get('/items', getItemListController);

// POST/GET 类接口需要完整认证
router.use(authMiddleware);
router.get('/gold', getGoldCoinsController);
router.post('/sign-in', signInController);
router.post('/exchange/avatar-frame', exchangeAvatarFrameController);
router.post('/exchange/chat-bubble', exchangeChatBubbleController);
router.post('/exchange/special-signature', exchangeSpecialSignatureController);
router.get('/transactions', getGoldTransactionsController);
router.get('/my-items', getMyItemsController);

export default router;
