import { Router } from 'express';
import {
  getUsersController,
  freezeUserController,
  unfreezeUserController,
  adjustCoordController,
  getContentAuditListController,
  approveContentController,
  rejectContentController,
  addSensitiveWordController,
  deleteSensitiveWordController,
  getBeastConfigController,
  updateBeastConfigController,
  getGoldConfigController,
  updateGoldConfigController,
  getDashboardController,
  getOperationLogsController
} from '../controllers/adminController';
import {
  getClubListAdminController,
  getClubDetailAdminController,
  updateClubAdminController,
  updateClubStatusController,
  deleteClubController,
  getProposalReviewListController,
  reviewProposalAdminController,
  batchReviewProposalsController,
  getVitalityStatsController,
  getVitalityTrendController,
  getVitalityTopClubsController,
  getLowVitalityWarningsController
} from '../controllers/clubAdminController';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth';

const router = Router();

// ==================== 用户管理模块 ====================

/**
 * @route   GET /api/admin/users
 * @desc    获取用户列表
 * @access  Private (Operator+)
 */
router.get('/users', requireAdmin, getUsersController);

/**
 * @route   POST /api/admin/users/freeze
 * @desc    冻结用户账号
 * @access  Private (Operator+)
 */
router.post('/users/freeze', requireAdmin, freezeUserController);

/**
 * @route   POST /api/admin/users/unfreeze
 * @desc    解冻用户账号
 * @access  Private (Operator+)
 */
router.post('/users/unfreeze', requireAdmin, unfreezeUserController);

/**
 * @route   POST /api/admin/users/adjust-coord
 * @desc    手动调整用户坐标
 * @access  Private (Super Admin)
 */
router.post('/users/adjust-coord', requireSuperAdmin, adjustCoordController);

// ==================== 内容审核模块 ====================

/**
 * @route   GET /api/admin/content-audit
 * @desc    获取内容审核列表
 * @access  Private (Operator+)
 */
router.get('/content-audit', requireAdmin, getContentAuditListController);

/**
 * @route   POST /api/admin/content-audit/approve
 * @desc    审核通过内容
 * @access  Private (Operator+)
 */
router.post('/content-audit/approve', requireAdmin, approveContentController);

/**
 * @route   POST /api/admin/content-audit/reject
 * @desc    审核拒绝内容
 * @access  Private (Operator+)
 */
router.post('/content-audit/reject', requireAdmin, rejectContentController);

/**
 * @route   POST /api/admin/sensitive-words
 * @desc    添加敏感词
 * @access  Private (Operator+)
 */
router.post('/sensitive-words', requireAdmin, addSensitiveWordController);

/**
 * @route   DELETE /api/admin/sensitive-words/:word_id
 * @desc    删除敏感词
 * @access  Private (Operator+)
 */
router.delete('/sensitive-words/:word_id', requireAdmin, deleteSensitiveWordController);

// ==================== 系统配置模块 ====================

/**
 * @route   GET /api/admin/beast-config
 * @desc    获取野兽潮配置
 * @access  Private (Operator+)
 */
router.get('/beast-config', requireAdmin, getBeastConfigController);

/**
 * @route   PUT /api/admin/beast-config
 * @desc    更新野兽潮配置
 * @access  Private (Super Admin)
 */
router.put('/beast-config', requireSuperAdmin, updateBeastConfigController);

/**
 * @route   GET /api/admin/gold-config
 * @desc    获取金币规则配置
 * @access  Private (Operator+)
 */
router.get('/gold-config', requireAdmin, getGoldConfigController);

/**
 * @route   PUT /api/admin/gold-config
 * @desc    更新金币规则配置
 * @access  Private (Super Admin)
 */
router.put('/gold-config', requireSuperAdmin, updateGoldConfigController);

// ==================== 数据看板模块 ====================

/**
 * @route   GET /api/admin/dashboard
 * @desc    获取数据看板
 * @access  Private (Operator+)
 */
router.get('/dashboard', requireAdmin, getDashboardController);

// ==================== 操作日志模块 ====================

/**
 * @route   GET /api/admin/operation-logs
 * @desc    获取操作日志
 * @access  Private (Operator+)
 */
router.get('/operation-logs', requireAdmin, getOperationLogsController);

// ==================== 俱乐部管理模块 ====================

/**
 * @route   GET /api/admin/clubs
 * @desc    获取俱乐部列表（管理后台）
 * @access  Private (Operator+)
 */
router.get('/clubs', requireAdmin, getClubListAdminController);

/**
 * @route   GET /api/admin/clubs/:id
 * @desc    获取俱乐部详情（管理后台）
 * @access  Private (Operator+)
 */
router.get('/clubs/:id', requireAdmin, getClubDetailAdminController);

/**
 * @route   PUT /api/admin/clubs/:id
 * @desc    更新俱乐部信息（管理后台）
 * @access  Private (Super Admin)
 */
router.put('/clubs/:id', requireSuperAdmin, updateClubAdminController);

/**
 * @route   PATCH /api/admin/clubs/:id/status
 * @desc    更新俱乐部状态
 * @access  Private (Super Admin)
 */
router.patch('/clubs/:id/status', requireSuperAdmin, updateClubStatusController);

/**
 * @route   DELETE /api/admin/clubs/:id
 * @desc    删除俱乐部
 * @access  Private (Super Admin)
 */
router.delete('/clubs/:id', requireSuperAdmin, deleteClubController);

// ==================== 提议审核模块 ====================

/**
 * @route   GET /api/admin/club-proposals
 * @desc    获取提议审核列表
 * @access  Private (Operator+)
 */
router.get('/club-proposals', requireAdmin, getProposalReviewListController);

/**
 * @route   POST /api/admin/club-proposals/:id
 * @desc    审核提议
 * @access  Private (Operator+)
 */
router.post('/club-proposals/:id', requireAdmin, reviewProposalAdminController);

/**
 * @route   POST /api/admin/club-proposals/batch
 * @desc    批量审核提议
 * @access  Private (Operator+)
 */
router.post('/club-proposals/batch', requireAdmin, batchReviewProposalsController);

// ==================== 活力值看板模块 ====================

/**
 * @route   GET /api/admin/club-vitality/stats
 * @desc    获取活力值统计
 * @access  Private (Operator+)
 */
router.get('/club-vitality/stats', requireAdmin, getVitalityStatsController);

/**
 * @route   GET /api/admin/club-vitality/trend
 * @desc    获取活力值趋势
 * @access  Private (Operator+)
 */
router.get('/club-vitality/trend', requireAdmin, getVitalityTrendController);

/**
 * @route   GET /api/admin/club-vitality/top
 * @desc    获取活力值TOP俱乐部
 * @access  Private (Operator+)
 */
router.get('/club-vitality/top', requireAdmin, getVitalityTopClubsController);

/**
 * @route   GET /api/admin/club-vitality/warnings
 * @desc    获取低活力预警
 * @access  Private (Operator+)
 */
router.get('/club-vitality/warnings', requireAdmin, getLowVitalityWarningsController);

export default router;
