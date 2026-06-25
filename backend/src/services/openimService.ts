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

// ============================================
// 俱乐部群组管理（扩展）
// ============================================

/**
 * 创建俱乐部群组
 */
export const createClubGroup = async (
  clubId: number,
  clubName: string,
  ownerUserId: string,
  memberUserIds: string[] = []
): Promise<{ groupId: string }> => {
  try {
    const data = {
      groupName: clubName,
      introduction: `俱乐部 ${clubName} 的群聊`,
      notification: '欢迎加入俱乐部！',
      faceURL: '',
      ownerUserID: ownerUserId,
      memberUserIDs: memberUserIds,
      adminUserIDs: [],
      ex: JSON.stringify({
        club_id: clubId,
        type: 'gamden_club'
      })
    };

    const result = await openimRequest('/group/create', 'POST', data);
    logger.info('创建俱乐部群组成功', { clubId, groupId: result.data?.groupID });

    return {
      groupId: result.data?.groupID || `club_${clubId}`
    };
  } catch (error: any) {
    logger.error('创建俱乐部群组失败', { clubId, error: error.message });
    // 失败时返回模拟ID
    return {
      groupId: `club_${clubId}_${Date.now()}`
    };
  }
};

/**
 * 添加成员到群组
 */
export const addMemberToGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    const data = {
      groupID: groupId,
      memberUserIDs: [userId],
      ex: ''
    };

    await openimRequest('/group/invite_user', 'POST', data);
    logger.info('添加成员到群组成功', { groupId, userId });
    return true;
  } catch (error: any) {
    logger.error('添加成员到群组失败', { groupId, userId, error: error.message });
    return false;
  }
};

/**
 * 批量添加成员到群组
 */
export const addMembersToGroup = async (
  groupId: string,
  userIds: string[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await addMemberToGroup(groupId, userId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  logger.info('批量添加成员到群组完成', { groupId, success, failed });
  return { success, failed };
};

/**
 * 移除群组成员
 */
export const removeMemberFromGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    const data = {
      groupID: groupId,
      memberUserIDs: [userId],
      ex: ''
    };

    await openimRequest('/group/remove_user', 'POST', data);
    logger.info('移除群组成员成功', { groupId, userId });
    return true;
  } catch (error: any) {
    logger.error('移除群组成员失败', { groupId, userId, error: error.message });
    return false;
  }
};

/**
 * 设置群组扩展字段
 */
export const setGroupCustomField = async (
  groupId: string,
  fields: Record<string, string>
): Promise<boolean> => {
  try {
    const data = {
      groupID: groupId,
      ex: JSON.stringify(fields)
    };

    await openimRequest('/group/update', 'POST', data);
    logger.info('设置群组扩展字段成功', { groupId, fields });
    return true;
  } catch (error: any) {
    logger.error('设置群组扩展字段失败', { groupId, fields, error: error.message });
    return false;
  }
};

/**
 * 发送俱乐部系统消息
 */
export const sendClubSystemMessage = async (
  groupId: string,
  message: string,
  messageType: 'welcome' | 'notice' | 'event' = 'notice'
): Promise<boolean> => {
  try {
    // 自定义消息类型：201=俱乐部系统消息
    const customData = {
      customType: 201,
      data: {
        type: messageType,
        content: message,
        timestamp: Date.now()
      }
    };

    const data = {
      sendID: 'system_club',
      recvID: '',
      groupID: groupId,
      contentType: 200, // 自定义消息
      content: JSON.stringify(customData),
      sessionType: 2, // 群聊
      ex: ''
    };

    await openimRequest('/message/send', 'POST', data);
    logger.info('发送俱乐部系统消息成功', { groupId, message });
    return true;
  } catch (error: any) {
    logger.error('发送俱乐部系统消息失败', { groupId, message, error: error.message });
    return false;
  }
};

/**
 * 获取群组成员列表
 */
export const getGroupMembers = async (
  groupId: string
): Promise<string[]> => {
  try {
    const result = await openimRequest(`/group/get_group_member_list?groupID=${groupId}`, 'GET');
    const members = result.data || [];
    return members.map((m: any) => m.userID);
  } catch (error: any) {
    logger.error('获取群组成员列表失败', { groupId, error: error.message });
    return [];
  }
};
