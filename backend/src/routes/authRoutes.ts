import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshTokenController,
  logoutController,
  sendSmsController,
  verifySmsController,
  changePasswordController,
  resetPasswordController,
  deleteAccountController,
  registerByPhoneController,
  loginByPhoneController
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

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
 * @route   POST /api/auth/register/phone
 * @desc    手机号验证码注册
 * @access  Public
 */
router.post('/register/phone', registerByPhoneController);

/**
 * @route   POST /api/auth/login/phone
 * @desc    手机号验证码登录
 * @access  Public
 */
router.post('/login/phone', loginByPhoneController);

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

/**
 * @route   POST /api/auth/sms/send
 * @desc    发送短信验证码
 * @access  Public
 */
router.post('/sms/send', sendSmsController);

/**
 * @route   POST /api/auth/sms/verify
 * @desc    验证短信验证码
 * @access  Public
 */
router.post('/sms/verify', verifySmsController);

/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码（通过短信验证码）
 * @access  Public
 */
router.post('/reset-password', resetPasswordController);

/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', authMiddleware, changePasswordController);

/**
 * @route   POST /api/auth/delete-account
 * @desc    注销账号
 * @access  Private
 */
router.post('/delete-account', authMiddleware, deleteAccountController);

export default router;
