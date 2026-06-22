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

export default router;
