/**
 * OpenIM SDK Stub
 * - 仅用于 vite build 时跳过 openim SDK 静态解析
 * - 运行时不会被引用（im.ts 已用 try/catch + dynamic import）
 * - 如果 polyfill 加载成功，会被替换；否则走 mock fallback
 */
const stub = {
  asyncInit: async () => undefined,
  login: async () => undefined,
  logout: async () => undefined,
  on: () => () => undefined,
  off: () => undefined,
  getTotalUnreadMsgCount: async () => 0,
  markConversationMessageAsRead: async () => undefined,
};

export default stub;
