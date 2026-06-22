import { Router } from 'express';
import {
  openimUserRegisterWebhook,
  openimUserLoginWebhook
} from '../controllers/webhookController';

const router = Router();

/**
 * @route   POST /webhook/openim/user-register
 * @desc    OpenIM用户注册Webhook
 * @access  Public（需要签名验证）
 */
router.post('/openim/user-register', openimUserRegisterWebhook);

/**
 * @route   POST /webhook/openim/user-login
 * @desc    OpenIM用户登录Webhook
 * @access  Public（需要签名验证）
 */
router.post('/openim/user-login', openimUserLoginWebhook);

export default router;
