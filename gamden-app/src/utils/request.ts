import type { ApiResponse, RequestOptions, AnyObject } from '@/types/api';
import { getDeviceId } from '@/utils/deviceId';

/**
 * 业务后端基础地址
 * - 默认值（小程序 / App 生产环境）：https://api.gamden.matux.tech/api
 * - H5 开发环境通过 vite.config.ts 的 server.proxy 把 /api 转发到本地后端
 * - 若调用方传入的 url 是绝对地址（http/https 开头），会跳过 BASE_URL 直接使用
 */
const BASE_URL = 'https://api.gamden.matux.tech/api';

const DEFAULT_TIMEOUT = 15_000;

/**
 * 设备ID 在请求中的字段名（与后端约定）
 */
const DEVICE_ID_FIELD = 'device_id';
const DEVICE_ID_HEADER = 'X-Device-ID';

/**
 * 是否为可注入 device_id 的纯对象（排除 string/array/buffer/formdata 等）
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * 把 device_id 拼接到 URL 的 query string
 * - 不破坏原有 query
 * - 已存在 device_id 时不覆盖（避免循环依赖和误覆盖）
 */
function appendDeviceIdToUrl(rawUrl: string, deviceId: string): string {
  // 已经是绝对地址直接追加（query string 形式）
  const fullUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : BASE_URL + rawUrl;
  const separator = fullUrl.includes('?') ? '&' : '?';
  // 若调用方已自带 device_id 则不重复注入
  if (fullUrl.includes(`${DEVICE_ID_FIELD}=`)) return fullUrl;
  return `${fullUrl}${separator}${DEVICE_ID_FIELD}=${encodeURIComponent(deviceId)}`;
}

/**
 * 把 device_id 合并到请求 body 对象
 * - 仅在 body 是普通对象时合并
 * - 已存在 device_id 时不覆盖
 */
function injectDeviceIdIntoBody(
  data: RequestOptions['data'],
  deviceId: string,
): RequestOptions['data'] {
  if (!isPlainObject(data)) return data;
  if (DEVICE_ID_FIELD in data) return data;
  return { ...data, [DEVICE_ID_FIELD]: deviceId };
}

/**
 * 统一请求封装 - 基于 uni.request
 * 自动处理：
 *  - 加载提示
 *  - 401 跳转登录
 *  - 业务错误码提示
 *  - Token 注入
 *  - **设备ID 注入**（X-Device-ID Header + GET query / POST body device_id 字段）
 */
export function request<T = unknown>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    loadingText = '加载中...',
    silent = false,
    /** 401 时不清 token、不跳登录（用于 token 刷新等内部接口） */
    skipAuthRedirect = false,
  } = options;

  if (showLoading) {
    uni.showLoading({ title: loadingText, mask: true });
  }

  // 注入 token
  const token = uni.getStorageSync('gamden_token');
  // 注入设备ID（始终可读，因 hydrate() 已在 App.vue 启动时初始化）
  const deviceId = getDeviceId();

  const finalHeader: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  };
  if (token) {
    finalHeader['Authorization'] = `Bearer ${token}`;
  }
  // 设备ID 始终随 Header 透传（GET/POST 通用方式，便于后端中间件 deviceIdMiddleware 读取）
  if (deviceId) {
    finalHeader[DEVICE_ID_HEADER] = deviceId;
  }

  // body / URL 注入：GET/DELETE 走 query，POST/PUT/PATCH 走 body（与后端 deviceIdMiddleware 配合）
  const upperMethod = (method || 'GET').toUpperCase();
  let finalUrl = url;
  let finalData: RequestOptions['data'] = data;

  if (upperMethod === 'GET' || upperMethod === 'DELETE') {
    finalUrl = appendDeviceIdToUrl(url, deviceId);
  } else {
    finalData = injectDeviceIdIntoBody(data, deviceId);
  }

  return new Promise<T>((resolve, reject) => {
    // 将 method 转换为 uni.request 类型；PATCH 在 UniApp 类型中缺失，此处通过 unknown 绕过
    const uniMethod = upperMethod as unknown as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'OPTIONS'
      | 'HEAD'
      | 'TRACE'
      | 'CONNECT';
    uni.request({
      url: /^https?:\/\//.test(finalUrl) ? finalUrl : BASE_URL + finalUrl,
      method: uniMethod,
      data: finalData,
      header: finalHeader,
      timeout: DEFAULT_TIMEOUT,
      success: (res) => {
        if (showLoading) uni.hideLoading();

        const body = res.data as ApiResponse<T>;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body && body.code === 0) {
            resolve(body.data);
          } else if (body && body.code === 401) {
            if (!silent) {
              uni.showToast({ title: '请重新登录', icon: 'none' });
            }
            if (!skipAuthRedirect) {
              uni.removeStorageSync('gamden_token');
              uni.reLaunch({ url: '/pages/auth/login' });
            }
            reject(new Error('Unauthorized'));
          } else {
            if (!silent) {
              uni.showToast({
                title: body?.message || '请求失败',
                icon: 'none',
              });
            }
            reject(new Error(body?.message || `HTTP ${res.statusCode}`));
          }
        } else {
          if (!silent) {
            uni.showToast({
              title: `网络异常(${res.statusCode})`,
              icon: 'none',
            });
          }
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        if (showLoading) uni.hideLoading();
        if (!silent) {
          uni.showToast({ title: '网络连接失败', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

export const http = {
  get: <T = unknown>(url: string, data?: string | AnyObject | ArrayBuffer, opts?: Partial<RequestOptions>) =>
    request<T>({ ...opts, url, method: 'GET', data }),
  post: <T = unknown>(url: string, data?: string | AnyObject | ArrayBuffer, opts?: Partial<RequestOptions>) =>
    request<T>({ ...opts, url, method: 'POST', data }),
  put: <T = unknown>(url: string, data?: string | AnyObject | ArrayBuffer, opts?: Partial<RequestOptions>) =>
    request<T>({ ...opts, url, method: 'PUT', data }),
  patch: <T = unknown>(url: string, data?: string | AnyObject | ArrayBuffer, opts?: Partial<RequestOptions>) =>
    request<T>({ ...opts, url, method: 'PATCH', data }),
  delete: <T = unknown>(url: string, data?: string | AnyObject | ArrayBuffer, opts?: Partial<RequestOptions>) =>
    request<T>({ ...opts, url, method: 'DELETE', data }),
};