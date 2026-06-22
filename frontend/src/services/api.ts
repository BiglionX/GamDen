import axios from 'axios';
import { getDeviceId } from '@/utils/deviceId';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 注入 device_id
    const deviceId = getDeviceId();
    if (deviceId) {
      config.headers['X-Device-ID'] = deviceId;
    }

    // 注入 token（如果有）
    const token = localStorage.getItem('gamden_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：解包 axios response，直接返回业务数据
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 游客态的 401 不强制跳转（需要登录的操作）
    if (error.response?.status === 401) {
      const needLogin = error.response?.data?.need_login;
      if (!needLogin) {
        // 真正的认证失效，清除 token
        localStorage.removeItem('gamden_token');
        localStorage.removeItem('gamden_user');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  register: (data: {
    phone: string;
    password: string;
    invite_code: string;
    guardian_type: string;
    nickname?: string;
  }) => api.post('/api/auth/register', data) as Promise<any>,

  login: (data: { phone: string; password: string }) =>
    api.post('/api/auth/login', data) as Promise<any>,

  refreshToken: (refresh_token: string) =>
    api.post('/api/auth/refresh', { refresh_token }) as Promise<any>,

  // 新增：短信验证码相关
  sendSms: (phone: string, purpose: 'register' | 'login' | 'reset_pwd') =>
    api.post('/api/auth/sms/send', { phone, purpose }) as Promise<any>,

  verifySms: (phone: string, code: string, purpose: 'register' | 'login' | 'reset_pwd') =>
    api.post('/api/auth/sms/verify', { phone, code, purpose }) as Promise<any>,

  registerByPhone: (data: {
    phone: string;
    sms_code: string;
    invite_code: string;
    guardian_type: string;
    nickname?: string;
    device_id?: string;
  }) => api.post('/api/auth/register/phone', data) as Promise<any>,

  loginByPhone: (data: { phone: string; sms_code: string; device_id?: string }) =>
    api.post('/api/auth/login/phone', data) as Promise<any>,

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/api/auth/change-password', data) as Promise<any>,

  resetPassword: (data: { phone: string; sms_code: string; new_password: string }) =>
    api.post('/api/auth/reset-password', data) as Promise<any>,

  deleteAccount: (password: string) =>
    api.post('/api/auth/delete-account', { password }) as Promise<any>,
};

// 微信 API
export const wechatAPI = {
  miniLogin: (data: { code: string; device_id?: string }) =>
    api.post('/api/wechat/mini-login', data) as Promise<any>,
};

// 埋点 API
export const trackingAPI = {
  trackEvent: (data: { event_name: string; event_data?: any }) =>
    api.post('/api/track/event', data) as Promise<any>,

  trackDwell: (data: { current_page: string; duration_seconds?: number }) =>
    api.post('/api/track/dwell', data) as Promise<any>,
};

// 领地API
export const territoryAPI = {
  getInfo: () => api.get('/api/territory/info') as Promise<any>,

  getNearby: (range?: number) =>
    api.get(`/api/map/nearby?range=${range || 10}`) as Promise<any>,

  updateSignature: (signature: string) =>
    api.put('/api/territory/signature', { signature }) as Promise<any>,
};

// 邀请API
export const inviteAPI = {
  getCode: () => api.get('/api/invite/code') as Promise<any>,

  getProgress: () => api.get('/api/invite/progress') as Promise<any>,

  getShareLink: () => api.get('/api/invite/share') as Promise<any>,
};

// 俱乐部API
export const clubAPI = {
  create: (data: { name: string; game_name: string; description?: string }) =>
    api.post('/api/club/create', data) as Promise<any>,

  getList: (params?: { page?: number; limit?: number; game_name?: string }) =>
    api.get('/api/club/list', { params }) as Promise<any>,

  getDetail: (clubId: number) => api.get(`/api/club/${clubId}`) as Promise<any>,

  createPost: (data: { club_id: number; content: string }) =>
    api.post('/api/club/post', data) as Promise<any>,

  getPosts: (clubId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/api/club/${clubId}/posts`, { params }) as Promise<any>,

  createReply: (data: { post_id: number; content: string }) =>
    api.post('/api/club/reply', data) as Promise<any>,

  deletePost: (postId: number) =>
    api.delete(`/api/club/posts/${postId}`) as Promise<any>,

  getPostReplies: (postId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/api/club/posts/${postId}/replies`, { params }) as Promise<any>,
};

// 商城API
export const shopAPI = {
  getGold: () => api.get('/api/shop/gold') as Promise<any>,

  signIn: () => api.post('/api/shop/sign-in') as Promise<any>,

  exchangeAvatarFrame: (item_id: string) =>
    api.post('/api/shop/exchange/avatar-frame', { item_id }) as Promise<any>,

  exchangeChatBubble: (item_id: string) =>
    api.post('/api/shop/exchange/chat-bubble', { item_id }) as Promise<any>,

  exchangeSpecialSignature: (days?: number) =>
    api.post('/api/shop/exchange/special-signature', { days }) as Promise<any>,

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get('/api/shop/transactions', { params }) as Promise<any>,

  getItems: () => api.get('/api/shop/items') as Promise<any>,

  getMyItems: () => api.get('/api/shop/my-items') as Promise<any>,
};

// Agent API
export const agentAPI = {
  getResponse: (trigger_event: string) =>
    api.get(`/api/agent/response?trigger_event=${trigger_event}`) as Promise<any>,

  getDialogues: (limit?: number) =>
    api.get(`/api/agent/dialogues?limit=${limit || 20}`) as Promise<any>,
};

export default api;