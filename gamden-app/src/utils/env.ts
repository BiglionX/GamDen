/**
 * GamDen 环境变量管理
 * ----------------------------------------------------------------------
 * 提供类型安全的环境变量访问
 * 支持 H5 / 微信小程序 / Android App 多端统一
 * ----------------------------------------------------------------------
 */

/** 环境变量类型定义 */
export interface EnvConfig {
  /** API 基础地址 */
  API_BASE_URL: string;
  /** OpenIM API 地址 */
  IM_API_URL: string;
  /** OpenIM WebSocket 地址 */
  IM_WS_URL: string;
  /** OpenIM App ID */
  IM_APP_ID: string;
  /** 微信小程序 AppID */
  WX_APPID: string;
  /** 是否调试模式 */
  DEBUG: boolean;
  /** 日志级别 */
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

/** 获取环境变量 - H5 端使用 import.meta.env */
function getH5Env(): EnvConfig {
  return {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
    IM_API_URL: import.meta.env.VITE_IM_API_URL || 'http://43.160.220.131:10002',
    IM_WS_URL: import.meta.env.VITE_IM_WS_URL || 'ws://43.160.220.131:10001',
    IM_APP_ID: import.meta.env.VITE_IM_APP_ID || 'gamden',
    WX_APPID: import.meta.env.VITE_WX_APPID || '',
    DEBUG: import.meta.env.VITE_DEBUG === true,
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  };
}

/** 获取环境变量 - 小程序端使用 uni.getSystemInfoSync */
function getMpEnv(): EnvConfig {
  // 小程序环境变量需要在编译时注入或通过配置文件获取
  // 这里使用默认值，实际项目中可以从远程配置或本地存储获取
  return {
    API_BASE_URL: 'https://gamden.matux.tech/api',
    IM_API_URL: 'https://im.gamden.matux.tech:10002',
    IM_WS_URL: 'wss://im.gamden.matux.tech:10001',
    IM_APP_ID: 'gamden',
    WX_APPID: '', // 从微信公众平台获取
    DEBUG: false,
    LOG_LEVEL: 'info',
  };
}

/** 获取环境变量 - App 端 */
function getAppEnv(): EnvConfig {
  return {
    API_BASE_URL: 'https://gamden.matux.tech/api',
    IM_API_URL: 'https://im.gamden.matux.tech:10002',
    IM_WS_URL: 'wss://im.gamden.matux.tech:10001',
    IM_APP_ID: 'gamden',
    WX_APPID: '',
    DEBUG: false,
    LOG_LEVEL: 'info',
  };
}

/**
 * 获取当前环境配置
 * 根据编译平台自动选择对应的环境变量
 */
export function getEnv(): EnvConfig {
  // #ifdef H5
  return getH5Env();
  // #endif

  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return getMpEnv();
  // #endif

  // #ifdef APP-PLUS
  return getAppEnv();
  // #endif

  // 默认返回 H5 配置
  return getH5Env();
}

/** 全局环境配置实例 */
export const env = getEnv();

/** 便捷访问 */
export const API_BASE_URL = env.API_BASE_URL;
export const IM_API_URL = env.IM_API_URL;
export const IM_WS_URL = env.IM_WS_URL;
export const IM_APP_ID = env.IM_APP_ID;
export const WX_APPID = env.WX_APPID;
export const DEBUG = env.DEBUG;
export const LOG_LEVEL = env.LOG_LEVEL;

/** 判断是否为开发环境 */
export const isDevelopment = import.meta.env.DEV;

/** 判断是否为生产环境 */
export const isProduction = import.meta.env.PROD;

/**
 * 设置运行时环境变量（用于动态切换环境）
 * @param config 部分环境配置
 */
export function setEnvConfig(config: Partial<EnvConfig>): void {
  Object.assign(env, config);
}

/**
 * 从远程配置服务器加载环境变量
 * @param url 配置服务器地址
 */
export async function loadRemoteEnv(url: string): Promise<Partial<EnvConfig>> {
  try {
    const response = await uni.request({
      url,
      method: 'GET',
    });
    
    if (response.statusCode === 200 && response.data) {
      return response.data as Partial<EnvConfig>;
    }
    
    return {};
  } catch (error) {
    console.error('[Env] 加载远程配置失败:', error);
    return {};
  }
}

/** 日志工具 */
export const logger = {
  debug: (...args: unknown[]) => DEBUG && console.log('[Debug]', ...args),
  info: (...args: unknown[]) => console.log('[Info]', ...args),
  warn: (...args: unknown[]) => console.warn('[Warn]', ...args),
  error: (...args: unknown[]) => console.error('[Error]', ...args),
};
