import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoginPayload, User, UserRole } from '@/types/user';
import { storage } from '@/utils/storage';
import { http } from '@/utils/request';
import { getDeviceId } from '@/utils/deviceId';

/**
 * 登录返回（与后端 TokenPairDto + user 对齐）
 */
export interface LoginResult {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    imUserId?: string;
    imToken?: string;
    imExpiresIn?: number;
    imExpireTime?: number;
  };
}

const STORAGE_KEY = 'user_profile';
const GUEST_DATA_KEY = 'guest_local_cache';

/**
 * 用户状态管理
 * - 游客态：未登录，可浏览但不能交互
 * - 注册态：完成注册流程，分配领地
 * - agent 角色：预留运营/代理身份
 *
 * 同时管理 OpenIM 凭据（imToken / imUserId / imExpireTime）：
 * - 业务登录成功后，后端会一并下发 IM Token
 * - App 启动时由 useImStore.bootstrap() 读 userStore 凭据自动登录 IM
 *
 * 设备ID（deviceId）说明：
 * - App 首次启动时自动生成并持久化
 * - 所有 API 请求（经 request 拦截器）自动携带 X-Device-ID 与 body.device_id
 * - 注册成功后由后端将 device_id 绑定到 user_id，并迁移游客浏览历史
 */
export const useUserStore = defineStore('user', () => {
  // ----------------- 状态 -----------------

  /** 用户基本信息（注册后由后端下发，未登录为 null） */
  const profile = ref<User | null>(null);
  /** 业务 access token */
  const token = ref<string>('');
  /** OpenIM 登录 token */
  const imToken = ref<string>('');
  /** OpenIM 用户 ID（与 GamDen userId 保持一致） */
  const imUserId = ref<string>('');
  /** OpenIM token 过期时间戳（秒） */
  const imExpireTime = ref<number>(0);
  /** 设备唯一标识（App 首次启动生成，跨会话持久化） */
  const deviceId = ref<string>('');

  // ----------------- 计算 -----------------

  /** 是否已注册（业务登录） */
  const isLoggedIn = computed(
    () => !!profile.value && profile.value.role === 'registered',
  );
  /** 是否游客态（未登录或显式进入游客模式） */
  const isGuest = computed(
    () => !profile.value || profile.value.role === 'guest',
  );
  /** 当前角色 */
  const role = computed<UserRole>(() => profile.value?.role ?? 'guest');
  /**
   * 用户信息别名（profile.userInfo 是同一份数据）
   * - 业务侧使用 userInfo 更符合通用语义
   * - 保留 profile 以兼容现有引用（territory / invite 等 store）
   */
  const userInfo = computed<User | null>(() => profile.value);
  /**
   * 游客态下展示的"脱敏"字段
   * - UI 顶部展示等级/金币时，若 isGuest 为 true 则使用 0 或 "???"
   */
  const maskedLevel = computed(() => (isGuest.value ? '???' : 0));
  const maskedCoin = computed(() => (isGuest.value ? 0 : 0));

  // ----------------- 本地恢复 -----------------

  /** App 启动时从本地恢复登录态 + 初始化设备ID */
  function hydrate(): void {
    // 1. 设备ID：必须在最早期初始化，确保后续 API 拦截器可用
    deviceId.value = getDeviceId();

    // 2. 恢复用户信息
    const cached = storage.get<User>(STORAGE_KEY);
    if (cached) {
      profile.value = cached;
    }
    token.value = uni.getStorageSync('gamden_token') || '';
    imToken.value = uni.getStorageSync('gamden_im_token') || '';
    imUserId.value = uni.getStorageSync('gamden_im_userid') || '';
    imExpireTime.value = uni.getStorageSync('gamden_im_expire') || 0;
  }

  // ----------------- 登录 -----------------

  /**
   * 真实环境：调后端 /auth/login 或 /auth/register
   * 登录成功后会自动触发 IM 登录（由 useImStore 监听）
   */
  async function login(payload: LoginPayload): Promise<void> {
    // -------- 真实环境 --------
    // const res = await http.post<LoginResult>('/auth/login', payload);
    // await applyLoginResult(res);

    // -------- V1.0 mock --------
    const mockUser: User = {
      id: `u_${Date.now()}`,
      nickname: `巢友${Math.floor(Math.random() * 9999)}`,
      role: 'registered',
      guardianType: payload.guardianType ?? 'mechanical',
      createdAt: Date.now(),
    };
    const mockRes: LoginResult = {
      user: mockUser,
      tokens: {
        accessToken: `mock_token_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
        expiresIn: 7200,
        imUserId: mockUser.id,
        imToken: `mock_im_${Date.now()}`,
        imExpiresIn: 7 * 24 * 3600,
        imExpireTime: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      },
    };
    await applyLoginResult(mockRes);
  }

  /**
   * 注册
   * - 后端会基于 deviceId 把游客浏览历史（领地访问/停留/动作日志）迁移到新账号
   */
  async function register(payload: LoginPayload): Promise<void> {
    // -------- 真实环境 --------
    // const res = await http.post<LoginResult>('/auth/register', {
    //   ...payload,
    //   deviceId: deviceId.value,
    // });
    // await applyLoginResult(res);

    // -------- V1.0 mock --------
    await login(payload);
  }

  /**
   * 应用后端登录结果
   * - 持久化用户信息、access token
   * - 持久化 IM token（如果有）
   * - 触发 IM 自动登录
   * - **清理游客态本地缓存**（浏览历史已迁移到新账号）
   */
  async function applyLoginResult(res: LoginResult): Promise<void> {
    profile.value = res.user;
    token.value = res.tokens.accessToken;
    storage.set(STORAGE_KEY, res.user);
    uni.setStorageSync('gamden_token', token.value);

    // IM token（注册时由后端创建 IM 账号并签发）
    if (res.tokens.imToken) {
      imToken.value = res.tokens.imToken;
      imUserId.value = res.tokens.imUserId ?? res.user.id;
      imExpireTime.value = res.tokens.imExpireTime ?? 0;
      persistIMToken();
    }

    // 游客本地缓存清理（设备ID 保持不变，因为设备ID是稳定标识）
    clearGuestLocalCache();

    // 触发 IM 登录（动态 import 避免循环依赖）
    try {
      const { useImStore } = await import('./im');
      const imStore = useImStore();
      await imStore.login({
        imUserId: imUserId.value,
        imToken: imToken.value,
        imExpiresIn: res.tokens.imExpiresIn ?? 0,
        imExpireTime: imExpireTime.value,
      });
    } catch (e) {
      console.warn('[user.applyLoginResult] IM 登录失败（不影响业务登录）:', e);
    }
  }

  // ----------------- 登出 -----------------

  /** 业务登出 */
  async function logout(): Promise<void> {
    // 登出 IM
    try {
      const { useImStore } = await import('./im');
      const imStore = useImStore();
      await imStore.logout();
    } catch {
      // ignore
    }

    profile.value = null;
    token.value = '';
    imToken.value = '';
    imUserId.value = '';
    imExpireTime.value = 0;
    storage.remove(STORAGE_KEY);
    uni.removeStorageSync('gamden_token');
    uni.removeStorageSync('gamden_im_token');
    uni.removeStorageSync('gamden_im_userid');
    uni.removeStorageSync('gamden_im_expire');
    // 注意：deviceId 不清除！登出后回到游客态，设备ID仍用于关联后续行为
  }

  /** 进入游客模式（显式调用，进入游客态 UI） */
  function enterGuestMode(): void {
    profile.value = {
      id: '',
      nickname: '游客',
      role: 'guest',
      createdAt: Date.now(),
    };
    storage.set(STORAGE_KEY, profile.value);
  }

  // ----------------- IM token 辅助 -----------------

  /** 持久化 IM token 到本地 */
  function persistIMToken(): void {
    uni.setStorageSync('gamden_im_token', imToken.value);
    uni.setStorageSync('gamden_im_userid', imUserId.value);
    uni.setStorageSync('gamden_im_expire', imExpireTime.value);
  }

  /**
   * 由 useImStore 在 token 刷新后调用
   * 同步更新内存 + 本地的 IM token
   */
  function updateIMToken(newToken: string, newExpireTime: number): void {
    imToken.value = newToken;
    imExpireTime.value = newExpireTime;
    uni.setStorageSync('gamden_im_token', newToken);
    uni.setStorageSync('gamden_im_expire', newExpireTime);
  }

  // ----------------- 游客态本地缓存 -----------------

  /**
   * 写入游客态本地缓存
   * - 例如：游客浏览过的领地 ID 列表、最近停留位置等
   * - 注册成功后会被后端迁库并清理
   */
  function setGuestLocalCache(data: Record<string, unknown>): void {
    storage.set(GUEST_DATA_KEY, data);
  }

  /** 读取游客态本地缓存 */
  function getGuestLocalCache<T extends Record<string, unknown> = Record<string, unknown>>(): T | null {
    return storage.get<T>(GUEST_DATA_KEY);
  }

  /** 清除游客态本地缓存（注册成功/退出登录时调用） */
  function clearGuestLocalCache(): void {
    storage.remove(GUEST_DATA_KEY);
  }

  return {
    // state
    profile,
    token,
    imToken,
    imUserId,
    imExpireTime,
    deviceId,
    // getters
    isLoggedIn,
    isGuest,
    role,
    userInfo,
    maskedLevel,
    maskedCoin,
    // actions
    hydrate,
    login,
    register,
    applyLoginResult,
    logout,
    enterGuestMode,
    updateIMToken,
    setGuestLocalCache,
    getGuestLocalCache,
    clearGuestLocalCache,
  };
});