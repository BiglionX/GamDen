import { Router } from 'express';
import {
  getAgentResponseController,
  getAgentDialoguesController,
  triggerAgentMessageController
} from '../controllers/agentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 所有Agent相关接口都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/agent/response
 * @desc    获取守护灵回复（测试用）
 * @access  Private
 */
router.get('/response', getAgentResponseController);

/**
 * @route   GET /api/agent/dialogues
 * @desc    获取守护灵对话历史
 * @access  Private
 */
router.get('/dialogues', getAgentDialoguesController);

/**
 * @route   POST /api/agent/trigger
 * @desc    手动触发守护灵消息（测试用）
 * @access  Private
 */
router.post('/trigger', triggerAgentMessageController);

export default router;
