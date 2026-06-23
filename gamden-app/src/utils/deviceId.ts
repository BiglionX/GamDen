/**
 * 设备唯一标识工具（DeviceID）
 *
 * 设计要点：
 * 1. 首次启动时生成 UUID v4，持久化到本地存储，整个 App 生命周期不变
 * 2. 用于：
 *    - 游客态身份标识（后端通过 device_id 关联游客浏览/埋点/设备访问数据）
 *    - 所有 API 请求自动注入 X-Device-ID Header + body.device_id 字段
 *    - 注册成功后由后端绑定到 user_id，迁移游客历史
 * 3. 跨端兼容：
 *    - H5: crypto.randomUUID() 或 getRandomValues() 兜底
 *    - 小程序/App: 与 H5 行为一致（uni 抹平差异）
 *
 * 注意：storage 已统一通过 @/utils/storage 加 gamden_ 前缀
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * 生成符合 RFC 4122 的 UUID v4
 * - 优先使用 crypto.randomUUID()（H5/Node 19+/现代运行时）
 * - 兜底使用 crypto.getRandomValues()（小程序/App 端可用）
 * - 最后兜底用 Math.random（不推荐，仅用于极端降级）
 */
export function generateUUID(): string {
  // 1) 现代运行时原生 API（H5 / 高版本客户端）
  const cryptoObj: Crypto | undefined =
    typeof crypto !== 'undefined' ? (crypto as Crypto) : undefined;

  if (cryptoObj?.randomUUID) {
    try {
      return cryptoObj.randomUUID();
    } catch {
      /* ignore */
    }
  }

  // 2) getRandomValues 兜底（小程序 / App 端可用）
  if (cryptoObj?.getRandomValues) {
    try {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      // 设置 UUID v4 标志位
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex: string[] = [];
      for (let i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] + 0x100).toString(16).slice(1));
      }
      return (
        hex.slice(0, 4).join('') +
        '-' +
        hex.slice(4, 6).join('') +
        '-' +
        hex.slice(6, 8).join('') +
        '-' +
        hex.slice(8, 10).join('') +
        '-' +
        hex.slice(10, 16).join('')
      );
    } catch {
      /* ignore */
    }
  }

  // 3) Math.random 兜底（不推荐，仅用于极端降级场景）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取设备唯一标识
 * - 首次调用：生成新 UUID 并持久化
 * - 后续调用：直接返回本地存储值
 *
 * 注意：必须在 App 启动早期调用（App.vue onLaunch 中），以便后续 API 拦截器可用
 */
export function getDeviceId(): string {
  // 使用 uni.storageSync 直读，避免循环依赖 @/utils/storage
  let deviceId = '';
  try {
    deviceId = uni.getStorageSync('gamden_' + DEVICE_ID_KEY) || '';
  } catch (err) {
    console.warn('[deviceId] read storage failed:', err);
  }

  if (deviceId && typeof deviceId === 'string' && deviceId.length >= 16) {
    return deviceId;
  }

  // 首次启动或本地值无效：生成并持久化
  deviceId = generateUUID();
  try {
    uni.setStorageSync('gamden_' + DEVICE_ID_KEY, deviceId);
  } catch (err) {
    console.warn('[deviceId] write storage failed:', err);
  }
  return deviceId;
}

/**
 * 清除设备唯一标识
 * - 通常在"完全重置 App"时使用
 * - 注册成功、登出等场景不应清除（设备ID是稳定的设备标识）
 */
export function clearDeviceId(): void {
  try {
    uni.removeStorageSync('gamden_' + DEVICE_ID_KEY);
  } catch (err) {
    console.warn('[deviceId] remove storage failed:', err);
  }
}