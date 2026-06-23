import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

/**
 * GamDen App - Vite 多端编译配置
 * ----------------------------------------------------------------------
 * 支持平台：
 * - H5：npm run dev:h5 / npm run build:h5
 * - 微信小程序：npm run dev:mp-weixin / npm run build:mp-weixin
 * - Android App：npm run dev:app-android / npm run build:app-android
 * ----------------------------------------------------------------------
 * 环境变量通过 .env.development / .env.production 管理
 * 所有 VITE_ 前缀变量自动注入到 import.meta.env
 */
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isDev = mode === 'development';

  return {
    plugins: [uni()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // OpenIM SDK 在 vite build 阶段无法静态解析（依赖 protobuf）
        // 统一替换为本地 stub；运行时通过动态 import + try/catch 加载真实 SDK
        '@openim/client-sdk': path.resolve(__dirname, './src/utils/im-stub.ts'),
        'openim-uniapp-polyfill': path.resolve(__dirname, './src/utils/im-stub.ts'),
      },
    },

    // 定义全局常量，将环境变量注入到代码中
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.VITE_IM_API_URL': JSON.stringify(env.VITE_IM_API_URL),
      'import.meta.env.VITE_IM_WS_URL': JSON.stringify(env.VITE_IM_WS_URL),
      'import.meta.env.VITE_IM_APP_ID': JSON.stringify(env.VITE_IM_APP_ID),
      'import.meta.env.VITE_WX_APPID': JSON.stringify(env.VITE_WX_APPID),
      'import.meta.env.VITE_DEBUG': JSON.stringify(env.VITE_DEBUG === 'true'),
      'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(env.VITE_LOG_LEVEL),
    },

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `
            @import "@/styles/variables.scss";
          `,
        },
      },
    },

    // H5 开发服务器配置
    server: {
      host: env.VITE_H5_HOST || '0.0.0.0',
      port: parseInt(env.VITE_H5_PORT || '9000'),
      open: false,
      cors: true,
      // 代理配置 - 解决开发环境跨域问题
      proxy: {
        // API 代理
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '/api'),
        },
        // OpenIM API 代理（可选，用于本地调试）
        '/openim-api': {
          target: env.VITE_IM_API_URL || 'http://43.160.220.131:10002',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/openim-api/, ''),
        },
      },
    },

    // 生产构建配置
    build: {
      target: 'es2015',
      cssCodeSplit: false,
      sourcemap: isDev,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
        },
      },
      // 小程序包体积优化
      rollupOptions: {
        output: {
          // 分包策略
          manualChunks: {
            'vendor': ['vue', 'pinia'],
            'uview': ['uview-plus'],
          },
        },
      },
      // 小程序包体积限制：2MB
      chunkSizeWarningLimit: 2000,
    },

    // 优化配置
    optimizeDeps: {
      include: ['vue', 'pinia', 'uview-plus'],
      exclude: ['@dcloudio/uni-app'],
    },
  };
});
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

// GamDen App - Vite 配置
// 支持目标：H5 开发 + 微信小程序编译（npm run dev:mp-weixin）
// 注：uview-plus 组件采用 pages.json 中的 easycom 自动按需引入，无需在此处额外配置
export default defineConfig({
  plugins: [uni()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // OpenIM SDK 在 vite build 阶段无法静态解析（依赖 protobuf）
      // 统一替换为本地 stub；运行时通过动态 import + try/catch 加载真实 SDK
      '@openim/client-sdk': path.resolve(__dirname, './src/utils/im-stub.ts'),
      'openim-uniapp-polyfill': path.resolve(__dirname, './src/utils/im-stub.ts'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },

  server: {
    host: '0.0.0.0',
    port: 9000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/api'),
      },
    },
  },

  build: {
    target: 'es2015',
    cssCodeSplit: false,
    sourcemap: false,
  },
});
