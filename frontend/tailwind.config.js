/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GamDen 品牌色板（古风巢穴）
        brand: {
          ink: '#1E241F',         // 巢穴墨 - 主背景
          'ink-deep': '#161B17',  // 深巢穴 - 凹陷/迷雾
          'ink-raised': '#2A322B',// 抬升巢穴 - 卡片背景
          gold: '#C9A87C',        // 领地金 - 品牌主色
          'gold-light': '#D9BC93',// 浅金 - 悬停/高亮
          'gold-deep': '#A8865E', // 深金 - 按下/次级
          paper: '#F5F0E6',       // 宣纸白 - 主文字
          'paper-mute': '#D8D2C4',// 暗宣纸 - 辅助文字
          beacon: '#C0392B',      // 烽火红 - 警告/红点
          vitality: '#5A8F6C',    // 生机绿 - 成功
          mute: '#8A8A8A',        // 次级灰 - 分割线
        },
        // 守护灵类型色
        guardian: {
          mechanic: '#5A7A8F',    // 机械师 - 冷蓝灰
          elf: '#7CA67C',         // 精灵 - 嫩绿
          astrologer: '#8F6FA8',  // 占星师 - 神秘紫
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 12px rgba(201, 168, 124, 0.4)',
        'glow-beacon': '0 0 8px rgba(192, 57, 43, 0.6)',
        'nest-card': '0 2px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(245, 240, 230, 0.05)',
        'nest-deep': 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'nest-sm': '4px',
        'nest-md': '8px',
        'nest-lg': '12px',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(201, 168, 124, 0.4)' },
          '50%': { boxShadow: '0 0 16px rgba(201, 168, 124, 0.7)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        ripple: 'ripple 0.6s ease-out',
        glow: 'glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      backgroundImage: {
        'paper-texture':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.94 0 0 0 0 0.90 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        dark: '#1F2937',
      },
    },
  },
  plugins: [],
}
