import { Router } from 'express';
import {
  getTerritoryInfoController,
  getNearbyNeighborsController,
  updateSignatureController,
  getBeastStatusController
} from '../controllers/territoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { deviceIdMiddleware } from '../middleware/deviceIdMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// 设备 ID 中间件（所有路由都需要）
router.use(deviceIdMiddleware);

// GET 类接口公开（游客可浏览）
router.use(optionalAuthMiddleware);
router.get('/info', getTerritoryInfoController);
router.get('/map/nearby', getNearbyNeighborsController);
router.get('/map/beast-status', getBeastStatusController);

// POST/PUT 类接口需要完整认证
router.use(authMiddleware);
router.put('/signature', updateSignatureController);

export default router;
