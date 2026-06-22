import { Router } from 'express';
import {
  trackEventController,
  trackDwellController
} from '../controllers/trackingController';
import { deviceIdMiddleware } from '../middleware/deviceIdMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// 设备 ID 中间件
router.use(deviceIdMiddleware);
router.use(optionalAuthMiddleware);

/**
 * @route   POST /api/track/event
 * @desc    记录埋点事件
 * @access  Public
 */
router.post('/event', trackEventController);

/**
 * @route   POST /api/track/dwell
 * @desc    上报停留时长
 * @access  Public
 */
router.post('/dwell', trackDwellController);

export default router;
