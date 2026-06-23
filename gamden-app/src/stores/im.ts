import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import im from '@/utils/im';
import { imApi, type IMTokenInfo } from '@/utils/im-api';
import {
  IM_EVENTS,
  type NewMessagePayload,
  type UnreadCountPayload,
} from '@/utils/im-config';
import { useUserStore } from '@/stores/user';

/**
 * IM 连接状态
 */
export type ConnectionStatus =
  | 'disconnected' // 未连接
  | 'connecting' // 正在连接
  | 'connected' // 已连接
  | 'kickedOffline' // 被踢下线
  | 'tokenExpired'; // token 过期

/**
 * OpenIM 状态管理
 * - 暴露 isIMReady / unreadCount / connectionStatus
 * - 负责启动时 bootstrap、注册时自动登录、token 过期自动刷新
 */
export const useImStore = defineStore('im', () => {
  // ----------------- 状态 -----------------

  /** 是否已登录 IM */
  const isIMReady = ref(false);
  /** 未读消息总数 */
  const unreadCount = ref(0);
  /** 连接状态 */
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  /** SDK 初始化状态 */
  const isSDKInitialized = ref(false);

  // ----------------- 计算属性 -----------------

  /** 是否有未读消息 */
  const hasUnread = computed(() => unreadCount.value > 0);

  /** 用于 UI 展示的未读数（>99 显示 99+） */
  const unreadDisplay = computed(() => {
    if (unreadCount.value <= 0) return '';
    if (unreadCount.value > 99) return '99+';
    return String(unreadCount.value);
  });

  // ----------------- 启动流程 -----------------

  /**
   * App 启动时调用（App.vue onLaunch）
   * - 初始化 SDK
   * - 订阅事件
   * - 注入 token 刷新器
   * - 如有本地登录态，自动登录 IM
   */
  async function bootstrap(): Promise<void> {
    try {
      // 1. 注入 token 刷新器（必须在 init 之前）
      im.setTokenRefresher(refreshIMToken);

      // 2. 初始化 SDK
      await im.init();
      isSDKInitialized.value = true;

      // 3. 订阅事件
      subscribeEvents();

      // 4. 游客态：不登录 IM
      const userStore = useUserStore();
      if (userStore.isGuest) {
        console.log('[IM] 游客态，跳过 IM 登录');
        return;
      }

      // 5. 尝试恢复本地登录态
      await tryAutoLogin();
    } catch (e) {
      console.error('[IM] bootstrap 失败:', e);
      connectionStatus.value = 'disconnected';
    }
  }

  /**
   * 尝试自动登录（启动恢复 / 业务登录后）
   * - 优先使用本地缓存的 IM token
   * - token 即将过期 → 先刷新
   */
  async function tryAutoLogin(): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.profile?.id) return;

    const cached = im.restoreFromStorage();

    // 场景 1：有 IM token 缓存 → 直接登录
    if (cached && cached.userID === userStore.profile.id) {
      // 检查是否临近过期
      if (im.shouldRefreshToken(cached.expireTime)) {
        console.log('[IM] 本地 IM token 即将过期，刷新中...');
        await doRefreshAndLogin();
      } else {
        await performLogin(cached.userID, cached.token, cached.expireTime);
      }
      return;
    }

    // 场景 2：有业务登录态但无 IM token → 调后端刷新
    if (userStore.profile?.id) {
      console.log('[IM] 本地无 IM token，向后端请求新 token');
      await doRefreshAndLogin();
    }
  }

  /**
   * 业务登录/注册成功后调用
   * @param imToken 后端返回的 IM Token 信息
   */
  async function login(imToken: IMTokenInfo): Promise<void> {
    if (!isSDKInitialized.value) {
      await im.init();
      isSDKInitialized.value = true;
      subscribeEvents();
    }

    im.saveToken(imToken.imUserId, imToken.imToken, imToken.imExpireTime);
    await performLogin(imToken.imUserId, imToken.imToken, imToken.imExpireTime);
  }

  /**
   * 业务登出时调用
   */
  async function logout(): Promise<void> {
    try {
      await im.logout();
    } finally {
      isIMReady.value = false;
      unreadCount.value = 0;
      connectionStatus.value = 'disconnected';
    }
  }

  // ----------------- 私有：实际登录流程 -----------------

  async function performLogin(
    userID: string,
    token: string,
    expireTime: number,
  ): Promise<void> {
    connectionStatus.value = 'connecting';
    try {
      await im.login(userID, token);
      im.saveToken(userID, token, expireTime);
      // connectSuccess 事件会触发 isIMReady = true
    } catch (e) {
      console.error('[IM] 登录失败:', e);
      connectionStatus.value = 'disconnected';
      isIMReady.value = false;
    }
  }

  // ----------------- Token 刷新 -----------------

  /**
   * 调后端 /im/refresh-token 拿新 token
   * - 注入到 im.setTokenRefresher 中，IM SDK 触发过期事件时自动调用
   */
  async function refreshIMToken(): Promise<{
    userID: string;
    token: string;
    expireTime: number;
  } | null> {
    const userStore = useUserStore();
    if (!userStore.profile?.id) return null;

    try {
      const res = await imApi.refreshToken();

      // 同步更新 user store 中的 IM token
      userStore.updateIMToken(res.imToken, res.imExpireTime);

      return {
        userID: res.imUserId,
        token: res.imToken,
        expireTime: res.imExpireTime,
      };
    } catch (e) {
      console.error('[IM] /im/refresh-token 失败:', e);
      return null;
    }
  }

  /** 内部辅助：刷新后登录 */
  async function doRefreshAndLogin(): Promise<void> {
    const fresh = await refreshIMToken();
    if (fresh) {
      await performLogin(fresh.userID, fresh.token, fresh.expireTime);
    } else {
      connectionStatus.value = 'disconnected';
    }
  }

  // ----------------- 辅助：拉取未读 -----------------

  /**
   * 拉取未读总数（进入会话列表 / 主动刷新时调用）
   */
  async function refreshUnreadCount(): Promise<void> {
    const count = await im.getTotalUnreadCount();
    unreadCount.value = count;
  }

  /**
   * 标记已读后清零本地未读
   */
  function markAllRead(): void {
    unreadCount.value = 0;
  }

  // ----------------- 事件订阅 -----------------

  /**
   * 订阅 OpenIM SDK 事件
   * - connectSuccess → isIMReady=true, 拉未读
   * - kickedOffline → 提示 + 跳登录页
   * - userTokenExpired → 自动刷新
   * - newMessage / unreadChange → 更新未读
   */
  function subscribeEvents(): void {
    im.on(IM_EVENTS.CONNECT_SUCCESS, () => {
      connectionStatus.value = 'connected';
      isIMReady.value = true;
      console.log('[IM] 已连接');
      // 连接成功后拉取一次未读
      refreshUnreadCount().catch(() => {});
    });

    im.on(IM_EVENTS.CONNECTING, () => {
      connectionStatus.value = 'connecting';
    });

    im.on(IM_EVENTS.CONNECT_FAIL, (data: unknown) => {
      connectionStatus.value = 'disconnected';
      isIMReady.value = false;
      console.warn('[IM] 连接失败:', data);
    });

    im.on(IM_EVENTS.DISCONNECT, () => {
      connectionStatus.value = 'disconnected';
      isIMReady.value = false;
      console.log('[IM] 已断开');
    });

    im.on(IM_EVENTS.KICKED_OFFLINE, () => {
      connectionStatus.value = 'kickedOffline';
      isIMReady.value = false;
      console.warn('[IM] 被踢下线');
      uni.showModal({
        title: '账号在其他设备登录',
        content: '你已被踢下线，请重新登录',
        showCancel: false,
        success: () => {
          const userStore = useUserStore();
          userStore.logout();
          im.clearLocalToken();
          uni.reLaunch({ url: '/pages/auth/login' });
        },
      });
    });

    /**
     * token 过期（IM SDK 主动通知） → 自动刷新
     * - 走 im.refreshToken() → 调 im.setTokenRefresher 注册的 refreshIMToken
     */
    im.on(IM_EVENTS.USER_TOKEN_EXPIRED, () => {
      console.warn('[IM] token 过期，尝试自动刷新');
      connectionStatus.value = 'tokenExpired';
      im.refreshToken()
        .then((ok) => {
          if (!ok) {
            connectionStatus.value = 'disconnected';
            isIMReady.value = false;
          }
        })
        .catch((e) => console.error('[IM] 自动刷新失败:', e));
    });

    im.on(IM_EVENTS.TOTAL_UNREAD_MESSAGE_COUNT_CHANGED, (data: unknown) => {
      const payload = data as UnreadCountPayload | undefined;
      if (payload && typeof payload.totalCount === 'number') {
        unreadCount.value = payload.totalCount;
      }
    });

    im.on(IM_EVENTS.NEW_MESSAGE, (data: unknown) => {
      const msg = data as NewMessagePayload | undefined;
      // 只统计别人发来的消息
      const userStore = useUserStore();
      if (msg && msg.sendID && msg.sendID !== userStore.profile?.id) {
        unreadCount.value += 1;
      }
      console.log('[IM] 收到新消息:', msg?.clientMsgID);
    });
  }

  return {
    // state
    isIMReady,
    unreadCount,
    connectionStatus,
    isSDKInitialized,
    // getters
    hasUnread,
    unreadDisplay,
    // actions
    bootstrap,
    login,
    logout,
    refreshUnreadCount,
    markAllRead,
  };
});