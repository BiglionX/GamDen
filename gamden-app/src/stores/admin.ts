import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { http } from '@/utils/request';
import { storage } from '@/utils/storage';

/**
 * Admin 登录态管理
 *
 * 复用业务登录（auth/login）：
 *  - 运营人员通过 /auth/login 登录后，由后端下发 user（含 role==='admin'）
 *  - 校验 role==='admin' 后存入 admin_token / admin_profile
 *  - 退出 admin 时清理 admin 凭据，但不影响业务 user
 *
 * 设计原则：
 *  - admin 与业务 user 共享同一份 gamden_token（同一 JWT）
 *  - admin 凭据仅用于本地判断是否进入 admin 模块，不重新签发 token
 */

const STORAGE_TOKEN_KEY = 'gamden_token';
const STORAGE_PROFILE_KEY = 'user_profile';
const STORAGE_ADMIN_FLAG = 'gamden_is_admin';

interface AdminProfile {
  id: string;
  nickname: string;
  phone?: string;
  role: 'admin';
}

export const useAdminStore = defineStore('admin', () => {
  /** 当前 admin 用户（role==='admin'） */
  const profile = ref<AdminProfile | null>(null);

  /** 是否已登录 admin 端 */
  const isAdmin = computed(() => !!profile.value && profile.value.role === 'admin');

  /**
   * 从 storage 恢复（App.vue 启动时调用）
   * - 仅校验 role==='admin'，否则清空
   */
  function hydrate(): void {
    const cached = storage.get<AdminProfile>(STORAGE_PROFILE_KEY);
    if (cached && cached.role === 'admin') {
      profile.value = cached;
    } else {
      profile.value = null;
    }
  }

  /**
   * Admin 登录
   * - 复用业务 /auth/login 端点
   * - 后端返回的 user.role 必须为 'admin'，否则抛错
   * - 业务 token 已存入 gamden_token（http 拦截器自动注入）
   */
  async function login(payload: { phone: string; smsCode: string; nickname?: string }): Promise<void> {
    const res = await http.post<{
      user: AdminProfile;
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>('/auth/login', payload as unknown as Record<string, unknown>);

    if (!res?.user || res.user.role !== 'admin') {
      throw new Error('该账号无管理员权限');
    }

    profile.value = res.user;
    storage.set(STORAGE_PROFILE_KEY, res.user);
    uni.setStorageSync(STORAGE_TOKEN_KEY, res.tokens.accessToken);
    uni.setStorageSync(STORAGE_ADMIN_FLAG, '1');
  }

  /**
   * 退出 admin
   * - 清理 admin 凭据
   * - 业务 gamden_token 也清空（admin 不再继续访问业务侧）
   */
  async function logout(): Promise<void> {
    profile.value = null;
    storage.remove(STORAGE_PROFILE_KEY);
    uni.removeStorageSync(STORAGE_TOKEN_KEY);
    uni.removeStorageSync(STORAGE_ADMIN_FLAG);
  }

  return { profile, isAdmin, hydrate, login, logout };
});
