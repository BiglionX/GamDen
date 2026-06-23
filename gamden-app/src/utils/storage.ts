/**
 * 安全封装 uni.storage - 解决跨端类型不一致问题
 */
const PREFIX = 'gamden_';

export const storage = {
  set<T>(key: string, value: T): void {
    try {
      uni.setStorageSync(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.error('[storage.set] failed:', err);
    }
  },

  get<T>(key: string, fallback: T | null = null): T | null {
    try {
      const raw = uni.getStorageSync(PREFIX + key);
      if (raw === '' || raw === null || raw === undefined) return fallback;
      return JSON.parse(raw as string) as T;
    } catch (err) {
      console.error('[storage.get] failed:', err);
      return fallback;
    }
  },

  remove(key: string): void {
    try {
      uni.removeStorageSync(PREFIX + key);
    } catch (err) {
      console.error('[storage.remove] failed:', err);
    }
  },

  clear(): void {
    try {
      uni.clearStorageSync();
    } catch (err) {
      console.error('[storage.clear] failed:', err);
    }
  },
};
