import { Router } from 'express';
import {
  getTerritoryInfoController,
  getNearbyNeighborsController,
  updateSignatureController,
  getBeastStatusController
} from '../controllers/territoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 所有领地相关接口都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/territory/info
 * @desc    获取领地详情
 * @access  Private
 */
router.get('/info', getTerritoryInfoController);

/**
 * @route   GET /api/map/nearby
 * @desc    查看周围邻居
 * @access  Private
 */
router.get('/map/nearby', getNearbyNeighborsController);

/**
 * @route   PUT /api/territory/signature
 * @desc    更新签名
 * @access  Private
 */
router.put('/signature', updateSignatureController);

/**
 * @route   GET /api/map/beast-status
 * @desc    获取野兽潮状态
 * @access  Private
 */
router.get('/map/beast-status', getBeastStatusController);

export default router;
