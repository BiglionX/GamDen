import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { setIMConfig } from '@/utils/im-config';
import { guestRestrictedDirective } from '@/composables/useGuestRestriction';

// GamDen App 入口
// - Vue3 + Pinia 全局状态
// - SSR 模式以兼容小程序 / H5 / App 多端
//
// IM 配置优先级（运行时覆盖默认值）：
//   1. UNI_PLATFORM 全局变量（编译期注入）
//   2. import.meta.env.VITE_IM_API_URL / VITE_IM_WS_URL（H5 开发）
//   3. DEFAULT_IM_CONFIG（兜底默认值）

// 安全读取环境变量（H5 有 import.meta.env；小程序可通过 uni.getSystemInfoSync 注入）
function readEnv(key: string): string | undefined {
  // H5 / Vite
  const meta = (import.meta as any)?.env;
  if (meta && typeof meta[key] === 'string') return meta[key];
  // Node 端 / SSR
  try {
    const proc = (globalThis as any)?.process;
    if (proc?.env && typeof proc.env[key] === 'string') return proc.env[key];
  } catch {
    /* ignore */
  }
  return undefined;
}

setIMConfig({
  apiURL: readEnv('VITE_IM_API_URL'),
  wsURL: readEnv('VITE_IM_WS_URL'),
});

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();

  app.use(pinia);

  // 注册全局游客权限控制指令（v-guest-restricted）
  // - 模板用法：<button v-guest-restricted="'like'">点赞</button>
  // - 或：<button v-guest-restricted="{ scene: 'post' }">发帖</button>
  app.directive('guest-restricted', guestRestrictedDirective);

  return {
    app,
    pinia,
  };
}