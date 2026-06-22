import tencentcloud from 'tencentcloud-sdk-nodejs';
import { AppError } from '../middleware/errorHandler';

/**
 * 腾讯云内容安全服务
 * 用于UGC内容审核（用户签名、俱乐部帖子、回帖）
 */

// 初始化腾讯云客户端
const CmsClient = tencentcloud.tms.v20201229.Client;

let cmsClient: any = null;

/**
 * 初始化腾讯云内容安全客户端
 */
export const initContentAuditClient = () => {
  try {
    const secretId = process.env.TENCENT_CLOUD_SECRET_ID;
    const secretKey = process.env.TENCENT_CLOUD_SECRET_KEY;
    
    if (!secretId || !secretKey) {
      console.warn('⚠️ 腾讯云密钥未配置，内容审核功能将不可用');
      return null;
    }
    
    cmsClient = new CmsClient({
      credential: {
        secretId,
        secretKey,
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'tms.tencentcloudapi.com',
        },
      },
    });
    
    console.log('✅ 腾讯云内容安全客户端初始化成功');
    return cmsClient;
  } catch (error: any) {
    console.error('❌ 腾讯云内容安全客户端初始化失败:', error.message);
    return null;
  }
};

/**
 * 文本审核
 * @param content 待审核文本
 * @returns 审核结果
 */
export const auditText = async (content: string): Promise<{
  suggestion: 'Pass' | 'Review' | 'Block';
  confidence: number;
  label: string;
  keywords?: string[];
}> => {
  try {
    // 如果没有配置腾讯云密钥，默认通过
    if (!cmsClient) {
      console.warn('⚠️ 腾讯云客户端未初始化，内容将直接通过');
      return {
        suggestion: 'Pass',
        confidence: 99,
        label: 'Normal'
      };
    }
    
    // 调用腾讯云文本审核API
    const params = {
      Content: Buffer.from(content).toString('base64'), // 内容需Base64编码
      BizType: 'gamden_content_audit', // 业务类型（需在腾讯云控制台配置）
    };
    
    const response = await cmsClient.TextModeration(params);
    
    // 解析返回结果
    const result = response;
    
    return {
      suggestion: result.Suggestion || 'Pass',
      confidence: result.Confidence || 90,
      label: result.Label || 'Normal',
      keywords: result.Keywords || [],
    };
  } catch (error: any) {
    console.error('内容审核失败:', error.message);
    
    // 审核失败时，默认通过（避免影响用户体验）
    // 可根据业务需求调整为默认拒绝
    return {
      suggestion: 'Pass',
      confidence: 0,
      label: 'Error',
    };
  }
};

/**
 * 处理内容审核结果
 * 根据置信度决定是通过、进入人工复审池、还是直接拒绝
 * 
 * 规则：
 * - 置信度 > 90%：直接通过（Pass）
 * - 置信度 70%~90%：进入人工复审（Review）
 * - 置信度 < 70% 或敏感：拒绝发布（Block）
 */
export const processAuditResult = (
  auditResult: any,
  contentType: 'signature' | 'post' | 'reply',
  contentId: number,
  userId: number
): {
  action: 'pass' | 'review' | 'block';
  reason?: string;
} => {
  const { suggestion, confidence, label, keywords } = auditResult;
  
  // 记录审核结果到数据库
  recordAuditLog({
    contentType,
    contentId,
    userId,
    aiResult: suggestion,
    aiConfidence: confidence,
    aiLabel: label,
    keywords,
  });
  
  // 根据置信度决定操作
  if (confidence > 90 || suggestion === 'Pass') {
    return { action: 'pass' };
  } else if (confidence >= 70 || suggestion === 'Review') {
    return { action: 'review', reason: `AI初审不确定（置信度：${confidence}%）` };
  } else {
    return { action: 'block', reason: `AI初审拒绝（标签：${label}，命中词：${(keywords || []).join(', ')}）` };
  }
};

/**
 * 记录审核日志到数据库
 */
const recordAuditLog = async (params: {
  contentType: 'signature' | 'post' | 'reply';
  contentId: number;
  userId: number;
  aiResult: string;
  aiConfidence: number;
  aiLabel: string;
  keywords?: string[];
}) => {
  try {
    const { dbPool } = require('../config/database');
    
    if (!dbPool) {
      console.warn('⚠️ 数据库连接未初始化，跳过审核日志');
      return;
    }
    
    await dbPool.query(
      `INSERT INTO content_audit_logs 
       (content_type, content_id, user_id, ai_result, ai_confidence) 
       VALUES ($1, $2, $3, $4, $5)`,
      [params.contentType, params.contentId, params.userId, params.aiResult, params.aiConfidence]
    );
  } catch (error: any) {
    console.error('记录审核日志失败:', error.message);
  }
};

/**
 * 检查内容是否包含敏感词（本地敏感词库）
 * 作为AI审核的补充
 */
export const checkSensitiveWords = (content: string): {
  hasSensitive: boolean;
  matchedWords: string[];
} => {
  try {
    // 从数据库加载敏感词库
    // 这里简化为硬编码，实际应从数据库动态加载
    const sensitiveWords = ['敏感词1', '敏感词2', '广告'];
    
    const matchedWords: string[] = [];
    
    for (const word of sensitiveWords) {
      if (content.includes(word)) {
        matchedWords.push(word);
      }
    }
    
    return {
      hasSensitive: matchedWords.length > 0,
      matchedWords,
    };
  } catch (error: any) {
    console.error('检查敏感词失败:', error.message);
    return { hasSensitive: false, matchedWords: [] };
  }
};
