import axios from 'axios';
import { dbPool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * 微信服务
 * 处理微信登录、小程序生成等功能
 */

// 微信配置
const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || '';

/**
 * 获取微信Access Token
 */
const getAccessToken = async (): Promise<string> => {
  try {
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: WECHAT_APPID,
        secret: WECHAT_APPSECRET
      }
    });
    
    if (response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error('获取微信Access Token失败：' + JSON.stringify(response.data));
    }
  } catch (error: any) {
    console.error('❌ 获取微信Access Token失败:', error.message);
    throw new Error('获取微信Access Token失败');
  }
};

/**
 * 微信登录（小程序）
 * 使用wx.login()获取的code换取openid和session_key
 */
export const wechatLogin = async (code: string): Promise<{
  openid: string;
  session_key: string;
  unionid?: string;
}> => {
  try {
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WECHAT_APPID,
        secret: WECHAT_APPSECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });
    
    if (response.data.errcode) {
      throw new Error('微信登录失败：' + response.data.errmsg);
    }
    
    return {
      openid: response.data.openid,
      session_key: response.data.session_key,
      unionid: response.data.unionid
    };
  } catch (error: any) {
    console.error('❌ 微信登录失败:', error.message);
    throw new Error('微信登录失败');
  }
};

/**
 * 生成小程序码（无限参数）
 * 用于生成个人小程序码（邀请好友用）
 */
export const generateMiniProgramQRCode = async (
  userId: number,
  pagePath: string = 'pages/territory/index'
): Promise<string> => {
  try {
    // 获取access_token
    const accessToken = await getAccessToken();
    
    // 调用微信API生成小程序码
    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      {
        page: pagePath,
        scene: `user_id=${userId}`,
        width: 430,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 }
      },
      {
        responseType: 'arraybuffer' // 返回图片二进制数据
      }
    );
    
    // 检查是否返回错误
    if (response.data instanceof Buffer && response.data.toString().includes('errcode')) {
      const errorData = JSON.parse(response.data.toString());
      throw new Error('生成小程序码失败：' + errorData.errmsg);
    }
    
    // 将图片上传到COS（对象存储）或本地存储
    // 这里简化为返回base64字符串（实际应上传到COS）
    const base64Image = `data:image/png;base64,${response.data.toString('base64')}`;
    
    // 保存到数据库
    await saveMiniProgramRecord(userId, base64Image, pagePath);
    
    return base64Image;
  } catch (error: any) {
    console.error('❌ 生成小程序码失败:', error.message);
    throw new Error('生成小程序码失败');
  }
};

/**
 * 保存小程序记录到数据库
 */
const saveMiniProgramRecord = async (
  userId: number,
  qrCodeUrl: string,
  pagePath: string
): Promise<void> => {
  try {
    // 检查是否已存在记录
    const existingResult = await dbPool!.query(
      'SELECT id FROM mini_programs WHERE user_id = $1',
      [userId]
    );
    
    if (existingResult.rows.length > 0) {
      // 更新现有记录
      await dbPool!.query(
        `UPDATE mini_programs 
         SET qr_code_url = $1, page_path = $2, generated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $3`,
        [qrCodeUrl, pagePath, userId]
      );
    } else {
      // 插入新记录
      await dbPool!.query(
        `INSERT INTO mini_programs (user_id, qr_code_url, page_path) 
         VALUES ($1, $2, $3)`,
        [userId, qrCodeUrl, pagePath]
      );
    }
    
    // 更新邀请记录表中的mini_program_generated标志
    await dbPool!.query(
      `UPDATE invite_records SET mini_program_generated = TRUE 
       WHERE inviter_id = $1`,
      [userId]
    );
    
    console.log(`✅ 小程序码已生成并保存（用户ID: ${userId}）`);
  } catch (error: any) {
    console.error('❌ 保存小程序记录失败:', error.message);
    throw error;
  }
};

/**
 * 检查用户是否已解锁小程序（邀请≥3人）
 */
export const checkMiniProgramUnlock = async (userId: number): Promise<{
  unlocked: boolean;
  invited_count: number;
  required_count: number;
}> => {
  try {
    // 查询已邀请人数（is_active=true）
    const result = await dbPool!.query(
      `SELECT COUNT(*) as invited_count 
       FROM invite_records 
       WHERE inviter_id = $1 AND is_active = TRUE`,
      [userId]
    );
    
    const invitedCount = parseInt(result.rows[0].invited_count);
    const requiredCount = 3; // 需要邀请3人解锁小程序
    
    return {
      unlocked: invitedCount >= requiredCount,
      invited_count: invitedCount,
      required_count: requiredCount
    };
  } catch (error: any) {
    console.error('❌ 检查小程序解锁状态失败:', error.message);
    return {
      unlocked: false,
      invited_count: 0,
      required_count: 3
    };
  }
};

/**
 * 自动生成小程序（当邀请≥3人时）
 */
export const autoGenerateMiniProgram = async (userId: number): Promise<void> => {
  try {
    // 检查是否已解锁
    const unlockStatus = await checkMiniProgramUnlock(userId);
    
    if (!unlockStatus.unlocked) {
      console.log(`⚠️ 用户 ${userId} 尚未解锁小程序（已邀请 ${unlockStatus.invited_count}/${unlockStatus.required_count}）`);
      return;
    }
    
    // 检查是否已生成
    const existingResult = await dbPool!.query(
      'SELECT id FROM mini_programs WHERE user_id = $1',
      [userId]
    );
    
    if (existingResult.rows.length > 0) {
      console.log(`⚠️ 用户 ${userId} 的小程序已生成`);
      return;
    }
    
    // 生成小程序码
    console.log(`🚀 开始为用户 ${userId} 生成小程序码...`);
    await generateMiniProgramQRCode(userId);
    console.log(`✅ 用户 ${userId} 的小程序码生成成功`);
  } catch (error: any) {
    console.error(`❌ 自动生成小程序失败（用户ID: ${userId}）:`, error.message);
  }
};

/**
 * 微信登录（公众号/开放平台）
 * 使用网页授权获取的code换取access_token和openid
 */
export const wechatOAuthLogin = async (code: string): Promise<{
  openid: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  unionid?: string;
}> => {
  try {
    const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: WECHAT_APPID,
        secret: WECHAT_APPSECRET,
        code: code,
        grant_type: 'authorization_code'
      }
    });
    
    if (response.data.errcode) {
      throw new Error('微信OAuth登录失败：' + response.data.errmsg);
    }
    
    return {
      openid: response.data.openid,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      unionid: response.data.unionid
    };
  } catch (error: any) {
    console.error('❌ 微信OAuth登录失败:', error.message);
    throw new Error('微信OAuth登录失败');
  }
};

/**
 * 获取微信用户信息（OAuth）
 */
export const getWechatUserInfo = async (
  accessToken: string,
  openid: string
): Promise<{
  openid: string;
  nickname: string;
  avatar: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  unionid?: string;
}> => {
  try {
    const response = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: {
        access_token: accessToken,
        openid: openid,
        lang: 'zh_CN'
      }
    });
    
    if (response.data.errcode) {
      throw new Error('获取微信用户信息失败：' + response.data.errmsg);
    }
    
    return {
      openid: response.data.openid,
      nickname: response.data.nickname,
      avatar: response.data.headimgurl,
      gender: response.data.sex,
      city: response.data.city,
      province: response.data.province,
      country: response.data.country,
      unionid: response.data.unionid
    };
  } catch (error: any) {
    console.error('❌ 获取微信用户信息失败:', error.message);
    throw new Error('获取微信用户信息失败');
  }
};
