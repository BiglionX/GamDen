/**
 * GamDen 通用 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 简化的对象类型，兼容任意 JSON 入参
 */
export type AnyObject = Record<string, unknown>;

/**
 * 请求配置（扩展 uni.request）
 * - 业务侧常用方法：GET / POST / PUT / PATCH / DELETE
 * - 注：uni.request 运行时支持所有 HTTP 方法，本项目在运行时透传 method 字符串
 * - data: 允许 string / object / ArrayBuffer
 */
export interface RequestOptions {
  url: string;
  method?:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'OPTIONS'
    | 'HEAD'
    | 'TRACE'
    | 'CONNECT';
  data?: string | AnyObject | ArrayBuffer | undefined;
  header?: Record<string, string>;
  showLoading?: boolean;
  loadingText?: string;
  silent?: boolean;
  /** 401 时不清 token、不跳登录页（用于 token 刷新等内部接口） */
  skipAuthRedirect?: boolean;
}
