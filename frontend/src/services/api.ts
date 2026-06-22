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
    // 从localStorage获取Token
    const token = localStorage.getItem('gamden_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Token过期处理
    if (error.response?.status === 401) {
      localStorage.removeItem('gamden_token');
      localStorage.removeItem('gamden_user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  // 注册
  register: (data: {
    phone: string;
    password: string;
    invite_code: string;
    guardian_type: string;
    nickname?: string;
  }) => api.post('/api/auth/register', data),
  
  // 登录
  login: (data: { phone: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  // 刷新Token
  refreshToken: (refresh_token: string) =>
    api.post('/api/auth/refresh', { refresh_token }),
};

// 领地API
export const territoryAPI = {
  // 获取领地详情
  getInfo: () => api.get('/api/territory/info'),
  
  // 查看周围邻居
  getNearby: (range?: number) =>
    api.get(`/api/map/nearby?range=${range || 10}`),
  
  // 更新签名
  updateSignature: (signature: string) =>
    api.put('/api/territory/signature', { signature }),
};

// 邀请API
export const inviteAPI = {
  // 获取邀请码
  getCode: () => api.get('/api/invite/code'),
  
  // 查看邀请进度
  getProgress: () => api.get('/api/invite/progress'),
  
  // 获取分享链接
  getShareLink: () => api.get('/api/invite/share'),
};

// 俱乐部API
export const clubAPI = {
  // 创建俱乐部
  create: (data: { name: string; game_name: string; description?: string }) =>
    api.post('/api/club/create', data),
  
  // 获取俱乐部列表
  getList: (params?: { page?: number; limit?: number; game_name?: string }) =>
    api.get('/api/club/list', { params }),
  
  // 获取俱乐部详情
  getDetail: (clubId: number) => api.get(`/api/club/${clubId}`),
  
  // 发帖
  createPost: (data: { club_id: number; content: string }) =>
    api.post('/api/club/post', data),
  
  // 获取帖子列表
  getPosts: (clubId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/api/club/${clubId}/posts`, { params }),
  
  // 回复帖子
  createReply: (data: { post_id: number; content: string }) =>
    api.post('/api/club/reply', data),
};

// 商城API
export const shopAPI = {
  // 获取金币余额
  getGold: () => api.get('/api/shop/gold'),
  
  // 签到
  signIn: () => api.post('/api/shop/sign-in'),
  
  // 兑换头像框
  exchangeAvatarFrame: (item_id: string) =>
    api.post('/api/shop/exchange/avatar-frame', { item_id }),
  
  // 兑换聊天气泡
  exchangeChatBubble: (item_id: string) =>
    api.post('/api/shop/exchange/chat-bubble', { item_id }),
  
  // 兑换特殊签名
  exchangeSpecialSignature: (days?: number) =>
    api.post('/api/shop/exchange/special-signature', { days }),
  
  // 获取金币流水
  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get('/api/shop/transactions', { params }),
};

// Agent API
export const agentAPI = {
  // 获取守护灵回复
  getResponse: (trigger_event: string) =>
    api.get(`/api/agent/response?trigger_event=${trigger_event}`),
  
  // 获取对话历史
  getDialogues: (limit?: number) =>
    api.get(`/api/agent/dialogues?limit=${limit || 20}`),
};

export default api;
