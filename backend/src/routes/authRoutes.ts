import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshTokenController,
  logoutController
} from '../controllers/authController';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', registerController);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', loginController);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新Token
 * @access  Public
 */
router.post('/refresh', refreshTokenController);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', logoutController);

export default router;
