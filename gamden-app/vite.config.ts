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
  const isApp = mode.includes('app-');
  const isMp = mode.includes('mp-');

  // App 平台使用简化配置，避免与 uni-app 插件冲突
  if (isApp) {
    return {
      plugins: [uni()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@openim/client-sdk': path.resolve(__dirname, './src/utils/im-stub.ts'),
          'openim-uniapp-polyfill': path.resolve(__dirname, './src/utils/im-stub.ts'),
        },
      },
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
            additionalData: `@import "@/styles/variables.scss";`,
          },
        },
      },
      build: {
        target: 'es2020',
        cssCodeSplit: true,
        sourcemap: isDev,
        minify: 'terser',
        chunkSizeWarningLimit: 2000,
      },
      esbuild: {
        target: 'es2020',
      },
      optimizeDeps: {
        include: ['uview-plus'],
        exclude: ['@dcloudio/uni-app'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
    };
  }

  // H5 和小程序使用完整配置
  return {
    plugins: [uni()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@openim/client-sdk': path.resolve(__dirname, './src/utils/im-stub.ts'),
        'openim-uniapp-polyfill': path.resolve(__dirname, './src/utils/im-stub.ts'),
      },
    },

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
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },

    server: {
      host: env.VITE_H5_HOST || '0.0.0.0',
      port: parseInt(env.VITE_H5_PORT || '9000'),
      open: false,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
        '/openim-api': {
          target: env.VITE_IM_API_URL || 'http://43.160.220.131:10002',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/openim-api/, ''),
        },
      },
    },

    build: {
      target: 'es2020',
      cssCodeSplit: false,
      sourcemap: isDev,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
        },
      },
      rollupOptions: {
        output: {
          ...(isMp ? {
            manualChunks: {
              'vendor': ['vue', 'pinia'],
              'uview': ['uview-plus'],
            },
          } : {}),
        },
      },
      chunkSizeWarningLimit: 2000,
    },

    esbuild: {
      target: 'es2020',
    },

    optimizeDeps: {
      include: ['uview-plus'],
      exclude: ['@dcloudio/uni-app'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
  };
});
