/**
 * OpenIM SDK 统一封装
 * ----------------------------------------------------------------------
 * 本文件基于 openim-uniapp-polyfill 提供跨端一致的 OpenIM 接入能力：
 *   - H5 / 小程序 / App 一套 API
 *   - 内部自动选择最优实现（小程序走原生插件、H5 走 WebSocket、App 走 WebSocket）
 *
 * 核心方法：
 *   im.init()                 初始化 SDK（一次即可）
 *   im.login(userID, token)   登录 OpenIM
 *   im.logout()               登出
 *   im.on(event, handler)     订阅事件
 *   im.off(event, handler)    取消订阅
 *
 * 典型事件：
 *   connectSuccess             连接成功
 *   connectFailed              连接失败
 *   kickedOffline              被踢下线
 *   userTokenExpired           token 过期（自动刷新）
 *   newMessage                 新消息
 *   totalUnreadMessageCountChanged  未读数变化
 *
 * Token 自动刷新：
 *   - 启动前调用 `im.setTokenRefresher(fn)` 注册刷新逻辑
 *   - 触发 userTokenExpired / 启动前发现 token 临近过期 → 自动调用
 */

import {
  getIMConfig,
  setIMConfig,
  type IMConfig,
  type IMEventName,
} from './im-config';

// ----------------------------------------------------------------------
// SDK 加载（动态 import + stub fallback）
// ----------------------------------------------------------------------
// - 开发期：vite build 时 polyfill 依赖 protobuf 无法静态解析 → 用 im-stub 占位
// - 运行期：首次 init() 时尝试加载真实 polyfill；失败则抛出明确的错误
// ----------------------------------------------------------------------

let realSDK: any = null;
let sdkLoadAttempted = false;
let sdkLoadPromise: Promise<any> | null = null;

/** 动态加载 openim-uniapp-polyfill */
function loadSDK(): Promise<any> {
  if (realSDK) return Promise.resolve(realSDK);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = (async () => {
    sdkLoadAttempted = true;
    try {
      const mod: any = await import('openim-uniapp-polyfill');
      realSDK = (mod as { default?: unknown }).default ?? mod;
      console.log('[IM] openim-uniapp-polyfill 加载成功');
      return realSDK;
    } catch (e) {
      console.error('[IM] openim-uniapp-polyfill 加载失败:', e);
      throw new Error(
        '[IM] 加载 OpenIM SDK 失败，请确认已安装依赖 `npm install openim-uniapp-polyfill @openim/client-sdk`',
      );
    }
  })();

  return sdkLoadPromise;
}

// ----------------------------------------------------------------------
// 内部状态
// ----------------------------------------------------------------------

const STORAGE_KEYS = {
  TOKEN: 'gamden_im_token',
  USERID: 'gamden_im_userid',
  EXPIRE: 'gamden_im_expire',
} as const;

let initialized = false;
let loggedInUserId = '';
/** token 刷新器（由外部 store 注入，负责向后端请求新 token） */
let tokenRefresher:
  | (() => Promise<{ userID: string; token: string; expireTime: number } | null>)
  | null = null;

// ----------------------------------------------------------------------
// 公共 API
// ----------------------------------------------------------------------

export const im = {
  /** 是否已初始化 */
  isInitialized(): boolean {
    return initialized;
  },

  /** 当前登录用户 ID */
  currentUserId(): string {
    return loggedInUserId;
  },

  /** 运行时设置自定义配置 */
  setConfig(partial: Partial<IMConfig>): void {
    setIMConfig(partial);
  },

  /**
   * 注册 token 刷新器
   * - 由 useImStore 在初始化时注入
   * - 当 token 过期或临近过期时自动调用
   * - 返回 { userID, token, expireTime } | null（null 表示刷新失败）
   */
  setTokenRefresher(
    refresher: () => Promise<{ userID: string; token: string; expireTime: number } | null>,
  ): void {
    tokenRefresher = refresher;
  },

  /**
   * 初始化 SDK
   * - 必须先于 login() 调用
   * - 重复调用将直接返回
   */
  async init(): Promise<void> {
    if (initialized) return;

    const sdk = await loadSDK();
    if (typeof sdk.asyncInit !== 'function') {
      throw new Error('[IM] openim-uniapp-polyfill 缺少 asyncInit 方法');
    }

    const config = getIMConfig();
    await sdk.asyncInit({
      apiURL: config.apiURL,
      wsURL: config.wsURL,
      platform: config.platform,
      appID:
        // #ifdef MP-WEIXIN
        typeof uni !== 'undefined' && (uni as any).getAccountInfoSync
          ? (uni as any).getAccountInfoSync().miniProgram.appId
          : '',
      // #endif
      userIDType: config.userIDType ?? 'string',
      logLevel: config.logLevel ?? 1,
    });

    initialized = true;
    console.log('[IM] SDK 初始化成功', {
      apiURL: config.apiURL,
      wsURL: config.wsURL,
      platform: config.platform,
    });
  },

  /**
   * 登录 OpenIM
   * @param userID 用户 ID（与 GamDen userId 保持一致）
   * @param token  IM Token（来自后端 /auth/login 或 /im/refresh-token）
   */
  async login(userID: string, token: string): Promise<void> {
    if (!initialized) await this.init();

    const sdk = await loadSDK();
    if (typeof sdk.login !== 'function') {
      throw new Error('[IM] openim-uniapp-polyfill 缺少 login 方法');
    }

    await sdk.login({ userID, token });
    loggedInUserId = userID;

    uni.setStorageSync(STORAGE_KEYS.TOKEN, token);
    uni.setStorageSync(STORAGE_KEYS.USERID, userID);

    console.log(`[IM] 登录成功: ${userID}`);
  },

  /**
   * 登出 OpenIM
   * - 清除本地持久化 token
   * - 断开 WS 连接
   */
  async logout(): Promise<void> {
    if (!initialized) {
      // 即使未初始化也要清掉本地缓存
      this.clearLocalToken();
      return;
    }

    const sdk = await loadSDK();
    try {
      if (typeof sdk.logout === 'function') {
        await sdk.logout();
      }
    } catch (e) {
      console.warn('[IM] 登出失败（忽略）:', e);
    }

    this.clearLocalToken();
    loggedInUserId = '';
    console.log('[IM] 已登出');
  },

  /**
   * 订阅 SDK 事件
   * - 兼容 openim-uniapp-polyfill 的 IMSDK.on(event, handler)
   * - 返回取消订阅的函数
   */
  on(event: IMEventName, handler: (data: unknown) => void): () => void {
    // polyfill 必须在 login 之前也能 on（注册回调）
    // 所以这里**异步**调用，确保 SDK 已加载
    let unsub: (() => void) | null = null;

    loadSDK()
      .then((sdk) => {
        if (sdk && typeof sdk.on === 'function') {
          const sub = sdk.on(event, handler);
          unsub = () => {
            if (typeof sub === 'function') {
              sub();
            } else if (typeof sdk.off === 'function') {
              sdk.off(event, handler);
            }
          };
        }
      })
      .catch((e) => console.error('[IM] 订阅事件失败:', e));

    return () => {
      if (unsub) unsub();
    };
  },

  /**
   * 取消订阅
   */
  off(event: IMEventName, handler: (data: unknown) => void): void {
    loadSDK()
      .then((sdk) => {
        if (sdk && typeof sdk.off === 'function') {
          sdk.off(event, handler);
        }
      })
      .catch((e) => console.error('[IM] 取消订阅失败:', e));
  },

  // ------------------------------------------------------------
  // Token 持久化与自动刷新
  // ------------------------------------------------------------

  /**
   * 检查 token 是否即将过期（剩余 < thresholdSec）
   * @param expireTime 时间戳（秒）
   * @param thresholdSec 阈值秒数，默认 1 小时
   */
  shouldRefreshToken(expireTime: number, thresholdSec = 3600): boolean {
    if (!expireTime) return false;
    return expireTime - Date.now() / 1000 < thresholdSec;
  },

  /**
   * 从本地存储恢复登录态
   * - App 启动时由 store 调用
   */
  restoreFromStorage(): {
    userID: string;
    token: string;
    expireTime: number;
  } | null {
    const token = uni.getStorageSync(STORAGE_KEYS.TOKEN);
    const userID = uni.getStorageSync(STORAGE_KEYS.USERID);
    const expireTime = uni.getStorageSync(STORAGE_KEYS.EXPIRE);
    if (!token || !userID) return null;
    return { token, userID, expireTime: expireTime || 0 };
  },

  /**
   * 保存 IM token 到本地（登录或刷新后）
   */
  saveToken(userID: string, token: string, expireTime: number): void {
    uni.setStorageSync(STORAGE_KEYS.TOKEN, token);
    uni.setStorageSync(STORAGE_KEYS.USERID, userID);
    uni.setStorageSync(STORAGE_KEYS.EXPIRE, expireTime);
  },

  /**
   * 清空本地 token（登出时）
   */
  clearLocalToken(): void {
    uni.removeStorageSync(STORAGE_KEYS.TOKEN);
    uni.removeStorageSync(STORAGE_KEYS.USERID);
    uni.removeStorageSync(STORAGE_KEYS.EXPIRE);
  },

  /**
   * 触发 token 自动刷新
   * - 需要先通过 setTokenRefresher 注册刷新逻辑
   * - 用于 userTokenExpired 事件 / 启动前过期检查
   */
  async refreshToken(): Promise<boolean> {
    if (!tokenRefresher) {
      console.warn('[IM] 未注册 token 刷新器，无法自动刷新');
      return false;
    }

    try {
      const fresh = await tokenRefresher();
      if (!fresh) {
        console.warn('[IM] token 刷新失败（返回空）');
        return false;
      }
      // 重新登录
      await this.logout();
      await this.login(fresh.userID, fresh.token);
      console.log('[IM] token 已自动刷新');
      return true;
    } catch (e) {
      console.error('[IM] token 刷新异常:', e);
      return false;
    }
  },

  // ------------------------------------------------------------
  // 业务辅助方法
  // ------------------------------------------------------------

  /** 获取未读消息总数 */
  async getTotalUnreadCount(): Promise<number> {
    if (!initialized) return 0;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.getTotalUnreadMsgCount === 'function') {
        return await sdk.getTotalUnreadMsgCount();
      }
    } catch (e) {
      console.warn('[IM] getTotalUnreadCount 失败:', e);
    }
    return 0;
  },

  /** 标记会话已读（清零指定会话的未读） */
  async markConversationRead(conversationID: string): Promise<void> {
    if (!initialized) return;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.markConversationMessageAsRead === 'function') {
        await sdk.markConversationMessageAsRead(conversationID);
      }
    } catch (e) {
      console.warn('[IM] markConversationMessageAsRead 失败:', e);
    }
  },

  /** 获取 SDK 实例（高级 API 调用） */
  getSDK(): any {
    return realSDK;
  },

  // ------------------------------------------------------------
  // 单聊与会话相关 API（供业务侧 store / 页面直接调用）
  // ------------------------------------------------------------

  /**
   * 获取全部会话列表（OpenIM SDK getAllConversationList）
   * - 默认返回单聊 + 群聊会话，按最新消息倒序
   * - 失败 / SDK 未就绪时返回空数组
   */
  async getConversationList(): Promise<any[]> {
    if (!initialized) return [];
    try {
      const sdk = await loadSDK();
      if (typeof sdk.getAllConversationList === 'function') {
        const list = await sdk.getAllConversationList();
        return Array.isArray(list) ? list : [];
      }
    } catch (e) {
      console.warn('[IM] getAllConversationList 失败:', e);
    }
    return [];
  },

  /**
   * 获取指定会话的详情（OpenIM SDK getOneConversation）
   * @param sourceID 用户 ID 或 群组 ID
   * @param sessionType 1=单聊 2=群聊
   */
  async getOneConversation(sourceID: string, sessionType: 1 | 2 | 3): Promise<any | null> {
    if (!initialized || !sourceID) return null;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.getOneConversation === 'function') {
        const res = await sdk.getOneConversation({ sourceID, sessionType });
        return res ?? null;
      }
    } catch (e) {
      console.warn('[IM] getOneConversation 失败:', e);
    }
    return null;
  },

  /**
   * 构造会话 ID（OpenIM SDK getConversationIDBySessionType）
   * @param sourceID 用户 ID 或 群组 ID
   * @param sessionType 1=单聊 2=群聊
   */
  async getConversationID(sourceID: string, sessionType: 1 | 2 | 3): Promise<string> {
    if (!sourceID) return '';
    try {
      const sdk = await loadSDK();
      if (typeof sdk.getConversationIDBySessionType === 'function') {
        const id = await sdk.getConversationIDBySessionType({
          sourceID,
          sessionType,
        });
        return id ?? '';
      }
    } catch (e) {
      console.warn('[IM] getConversationIDBySessionType 失败:', e);
    }
    // 兜底：单聊 conversationID 格式（按字典序拼接）
    if (sessionType === 1) {
      return `si_${sourceID}`;
    }
    return '';
  },

  /**
   * 获取历史消息（OpenIM SDK getAdvancedHistoryMessageList）
   * @param conversationID 会话 ID
   * @param count 条数
   * @param startClientMsgID 起始 clientMsgID（首屏传空）
   */
  async getHistoryMessages(
    conversationID: string,
    count = 30,
    startClientMsgID = '',
  ): Promise<any[]> {
    if (!initialized || !conversationID) return [];
    try {
      const sdk = await loadSDK();
      if (typeof sdk.getAdvancedHistoryMessageList === 'function') {
        const list = await sdk.getAdvancedHistoryMessageList({
          conversationID,
          count,
          startClientMsgID,
        });
        return Array.isArray(list) ? list : [];
      }
    } catch (e) {
      console.warn('[IM] getAdvancedHistoryMessageList 失败:', e);
    }
    return [];
  },

  /**
   * 发送消息（OpenIM SDK sendMessage）
   * @param message 完整的 MessageItem 对象（含 clientMsgID / sendID / recvID / groupID / sessionType / contentType / content 等）
   */
  async sendMessage(message: Record<string, unknown>): Promise<boolean> {
    if (!initialized) return false;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.sendMessage === 'function') {
        await sdk.sendMessage(message);
        return true;
      }
    } catch (e) {
      console.error('[IM] sendMessage 失败:', e);
    }
    return false;
  },

  /**
   * 通过 SDK 创建文本消息（封装 createTextMessage）
   * - 返回的 MessageItem 可直接传给 sendMessage
   */
  async createTextMessage(text: string): Promise<any | null> {
    if (!initialized) return null;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.createTextMessage === 'function') {
        return await sdk.createTextMessage(text);
      }
    } catch (e) {
      console.warn('[IM] createTextMessage 失败:', e);
    }
    return null;
  },

  /**
   * 通过 SDK 创建表情消息（封装 createFaceMessage）
   */
  async createFaceMessage(index: number, data = ''): Promise<any | null> {
    if (!initialized) return null;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.createFaceMessage === 'function') {
        return await sdk.createFaceMessage({ index, data });
      }
    } catch (e) {
      console.warn('[IM] createFaceMessage 失败:', e);
    }
    return null;
  },

  /**
   * 通过 SDK 创建图片消息（封装 createImageMessage）
   * @param imagePath 本地图片路径
   */
  async createImageMessage(imagePath: string): Promise<any | null> {
    if (!initialized) return null;
    try {
      const sdk = await loadSDK();
      if (typeof sdk.createImageMessage === 'function') {
        return await sdk.createImageMessage(imagePath);
      }
      if (typeof sdk.createImageMessageFromFullPath === 'function') {
        return await sdk.createImageMessageFromFullPath(imagePath);
      }
    } catch (e) {
      console.warn('[IM] createImageMessage 失败:', e);
    }
    return null;
  },
};

export default im;