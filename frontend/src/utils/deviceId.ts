/**
 * 设备 ID 工具
 * 生成并持久化设备唯一标识
 */

const DEVICE_ID_KEY = 'gamden_device_id';

/**
 * 生成设备 ID
 */
const generateDeviceId = (): string => {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * 获取设备 ID（从 localStorage 读取，无则生成）
 */
export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

/**
 * 设置设备 ID（供后端响应覆盖）
 */
export const setDeviceId = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_ID_KEY, id);
};
