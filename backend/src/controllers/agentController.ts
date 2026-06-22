import { Request, Response, NextFunction } from 'express';
import {
  getAgentResponse,
  getAgentDialogues
} from '../services/agentService';
import { AppError } from '../middleware/errorHandler';

/**
 * 获取守护灵回复（测试用）
 */
export const getAgentResponseController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { trigger_event } = req.query;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!trigger_event) {
      throw new AppError('trigger_event参数缺失', 400, 400);
    }
    
    const response = await getAgentResponse(userId, trigger_event as string);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        response
      }
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};

/**
 * 获取守护灵对话历史
 */
export const getAgentDialoguesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    const dialogues = await getAgentDialogues(userId, limit);
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        dialogues
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手动触发守护灵消息（测试用）
 */
export const triggerAgentMessageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { trigger_event } = req.body;
    
    if (!userId) {
      throw new AppError('未授权', 401, 401);
    }
    
    if (!trigger_event) {
      throw new AppError('trigger_event参数缺失', 400, 400);
    }
    
    const { sendAgentMessage } = require('../services/agentService');
    const result = await sendAgentMessage(userId, trigger_event);
    
    res.status(200).json({
      code: 200,
      message: '守护灵消息发送成功',
      data: result
    });
  } catch (error: any) {
    if (error.message === '用户不存在') {
      next(new AppError(error.message, 404, 404));
    } else {
      next(error);
    }
  }
};
