import { Request, Response, NextFunction } from 'express';
import { createOpenIMUser } from '../services/openimService';
import { addExperience } from '../services/territoryService';
import { triggerWelcome, triggerInviteSuccess, triggerLevelUp } from '../services/agentService';
import { logger } from '../utils/logger';
import { dbPool } from '../config/database';

/**
 * OpenIM Webhook：用户注册事件
 */
export const openimUserRegisterWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userID, nickname, avatar, timestamp, signature } = req.body;
    
    // 验证签名
    const { verifyWebhookSignature } = require('../services/openimService');
    if (!verifyWebhookSignature(userID, timestamp, signature)) {
      return res.status(401).json({ code: 401, message: '签名验证失败' });
    }
    
    logger.info('收到OpenIM用户注册Webhook', { userID });
    
    // 在业务后台创建用户领地数据
    // 注意：实际流程应该是先注册GamDen账号，再同步到OpenIM
    // 这里仅作为备用同步机制
    
    // 返回成功响应（必须在5秒内返回）
    res.status(200).json({
      code: 200,
      message: 'success'
    });
  } catch (error: any) {
    logger.error('OpenIM用户注册Webhook处理失败', { error: error.message });
    next(error);
  }
};

/**
 * OpenIM Webhook：用户登录事件
 */
export const openimUserLoginWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userID, timestamp } = req.body;
    
    logger.info('收到OpenIM用户登录Webhook', { userID });
    
    // 更新最后登录时间
    await dbPool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [userID]
    );
    
    res.status(200).json({
      code: 200,
      message: 'success'
    });
  } catch (error: any) {
    logger.error('OpenIM用户登录Webhook处理失败', { error: error.message });
    next(error);
  }
};

/**
 * 同步用户到OpenIM（注册GamDen账号后调用）
 */
export const syncUserToOpenIM = async (
  userId: number,
  nickname: string,
  avatar: string
) => {
  try {
    await createOpenIMUser(
      userId.toString(),
      nickname,
      avatar || 'https://gamden.com/default-avatar.png'
    );
    
    logger.info('用户同步到OpenIM成功', { userId });
    return true;
  } catch (error: any) {
    logger.error('用户同步到OpenIM失败', { userId, error: error.message });
    return false;
  }
};

/**
 * 触发Agent事件（统一入口）
 */
export const triggerAgentEvent = async (
  userId: number,
  eventType: 'welcome' | 'sign_in' | 'invite_success' | 'level_up' | 'defend_success' | 'defend_fail'
) => {
  try {
    let result;
    
    switch (eventType) {
      case 'welcome':
        result = await triggerWelcome(userId);
        break;
      case 'sign_in':
        // 签到提醒（定时任务调用）
        result = await require('../services/agentService').triggerSignInRemind(userId);
        break;
      case 'invite_success':
        result = await triggerInviteSuccess(userId);
        break;
      case 'level_up':
        result = await triggerLevelUp(userId);
        break;
      case 'defend_success':
        result = await require('../services/agentService').triggerDefendSuccess(userId);
        break;
      case 'defend_fail':
        result = await require('../services/agentService').triggerDefendFail(userId);
        break;
    }
    
    // 发送OpenIM自定义消息
    if (result) {
      const { sendAgentCustomMessage } = require('../services/openimService');
      await sendAgentCustomMessage(
        userId.toString(),
        result.agent_type,
        result.response_text
      );
    }
    
    return result;
  } catch (error: any) {
    logger.error('触发Agent事件失败', { userId, eventType, error: error.message });
    return null;
  }
};
