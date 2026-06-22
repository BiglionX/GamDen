import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const OPENIM_API_URL = process.env.OPENIM_API_URL || 'http://localhost:18080';
const OPENIM_SECRET_KEY = process.env.OPENIM_SECRET_KEY || 'your_openim_secret';

/**
 * OpenIM API请求封装
 */
const openimRequest = async (endpoint: string, method: string, data?: any) => {
  try {
    const url = `${OPENIM_API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENIM_SECRET_KEY}`
    };
    
    const response = await axios({
      url,
      method,
      headers,
      data
    });
    
    return response.data;
  } catch (error: any) {
    logger.error('OpenIM API请求失败', { endpoint, error: error.message });
    throw error;
  }
};

/**
 * 创建用户
 */
export const createOpenIMUser = async (
  userId: string,
  nickname: string,
  avatar: string
) => {
  const data = {
    users: [
      {
        userID: userId,
        nickname: nickname,
        faceURL: avatar,
        gender: 0,
        phoneNumber: '',
        birth: 0,
        email: '',
        ex: ''
      }
    ]
  };
  
  return await openimRequest('/auth/user/register', 'POST', data);
};

/**
 * 创建群组（对应俱乐部）
 */
export const createOpenIMGroup = async (
  groupName: string,
  ownerUserId: string,
  memberUserIds: string[]
) => {
  const data = {
    groupName: groupName,
    introduction: '',
    notification: '',
    faceURL: '',
    ownerUserID: ownerUserId,
    memberUserIDs: memberUserIds,
    adminUserIDs: [],
    ex: ''
  };
  
  return await openimRequest('/group/create', 'POST', data);
};

/**
 * 发送消息
 */
export const sendOpenIMMessage = async (
  senderUserId: string,
  receiverUserId: string,
  contentType: number,
  content: string
) => {
  const data = {
    sendID: senderUserId,
    recvID: receiverUserId,
    groupID: '',
    contentType: contentType,
    content: content,
    sessionType: 1, // 单聊
    ex: ''
  };
  
  return await openimRequest('/message/send', 'POST', data);
};

/**
 * 发送自定义消息（Agent通知）
 */
export const sendAgentCustomMessage = async (
  userId: string,
  agentType: 'mechanic' | 'elf' | 'astrologer',
  content: string
) => {
  // 自定义消息类型：1001=Agent通知
  const customData = {
    customType: 1001,
    data: {
      agentType: agentType,
      avatar: `https://gamden.com/agents/${agentType}.png`,
      content: content,
      timestamp: Date.now()
    }
  };
  
  return await sendOpenIMMessage(
    'system_agent', // 系统Agent账号
    userId,
    200, // 自定义消息类型
    JSON.stringify(customData)
  );
};

/**
 * 验证Webhook签名
 */
export const verifyWebhookSignature = (
  userId: string,
  timestamp: number,
  signature: string
): boolean => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', OPENIM_SECRET_KEY)
    .update(`${userId}${timestamp}`)
    .digest('hex');
  
  return signature === expectedSignature;
};
