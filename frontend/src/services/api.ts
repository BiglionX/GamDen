import axios from 'axios';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('gamden_token');
      localStorage.removeItem('gamden_user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
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
};

// Agent API
export const agentAPI = {
  getResponse: (trigger_event: string) =>
    api.get(`/api/agent/response?trigger_event=${trigger_event}`) as Promise<any>,

  getDialogues: (limit?: number) =>
    api.get(`/api/agent/dialogues?limit=${limit || 20}`) as Promise<any>,
};

export default api;