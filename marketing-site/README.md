# GamDen 营销网站

> 在算法之外，建一座游戏巢穴

GamDen项目的官方营销网站，采用Next.js 14 + Tailwind CSS构建，具有现代化的设计和流畅的动画效果。

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 在浏览器中访问 http://localhost:3000

### 构建生产版本
```bash
npm run build
npm start
```

## 📁 项目结构

```
marketing-site/
├── app/
│   ├── (pages)/              # 页面路由
│   │   ├── page.tsx         # 首页
│   │   ├── product/         # 产品介绍
│   │   ├── stories/         # 用户故事
│   │   ├── developers/      # 开发者中心
│   │   ├── about/           # 关于我们
│   │   └── download/        # 下载中心
│   ├── globals.css          # 全局样式
│   └── layout.tsx           # 根布局
├── components/              # 公共组件
│   └── Navigation.tsx       # 导航组件
├── lib/                     # 工具函数
├── public/                  # 静态资源
│   └── images/              # 图片资源
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🎨 设计特色

- **视觉风格**：像素风 + 古风 + 科技感三重融合
- **主色调**：古铜金 (#D4AF37) + 深空黑 (#1A1A1A)
- **动画效果**：Framer Motion驱动的流畅交互动画
- **响应式设计**：完美适配桌面、平板、手机
- **性能优化**：SSR + 静态生成，首屏加载 < 2秒

## 🛠 技术栈

- **框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS 3.4
- **动画**：Framer Motion 11.2
- **图标**：Lucide React
- **字体**：Inter + Playfair Display + 思源宋体
- **部署**：支持Vercel、Netlify、自托管

## 📱 功能特性

### 首页
- 动态3D背景与视差滚动
- 核心特性卡片展示
- 实时数据统计
- 合作伙伴Logo墙

### 产品介绍
- 四大功能模块详细展示
- 技术架构可视化
- 标签页切换浏览

### 下载中心
- 多平台下载支持
- 邀请码申请系统
- 安装指南步骤

### 开发者中心
- API文档入口
- SDK下载
- 合作方案介绍

## 🚀 部署到服务器

### 方法一：使用现有Lighthouse服务器

1. 构建项目：
```bash
npm run build
```

2. 将构建产物复制到服务器：
```bash
# 创建部署目录
mkdir -p /opt/GamDen/marketing

# 复制构建文件
cp -r .next/* /opt/GamDen/marketing/
cp -r public/* /opt/GamDen/marketing/
cp -r package.json /opt/GamDen/marketing/
```

3. 在服务器上安装生产依赖：
```bash
cd /opt/GamDen/marketing
npm install --production
```

4. 使用PM2或Docker运行：
```bash
# 使用PM2
npm install -g pm2
pm2 start npm --name "gamden-marketing" -- start

# 或使用Docker
docker build -t gamden-marketing .
docker run -d -p 3001:3000 --name gamden-marketing gamden-marketing
```

### 方法二：部署到Vercel（推荐）

1. 在Vercel官网导入项目
2. 配置构建设置：
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. 添加自定义域名：gamden.proclaw.cc

### 方法三：部署到现有Nginx

1. 构建项目并复制文件到服务器
2. 配置Nginx反向代理：
```nginx
server {
    listen 80;
    server_name gamden.proclaw.cc;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 SEO优化

- 完整的Meta标签配置
- Open Graph社交分享优化
- Twitter Cards支持
- Schema.org结构化数据
- sitemap.xml自动生成
- robots.txt配置

## 🔧 自定义配置

### 修改站点信息
编辑 `app/layout.tsx` 中的metadata配置：

```typescript
export const metadata: Metadata = {
  title: '你的网站标题',
  description: '你的网站描述',
  // ... 其他配置
};
```

### 修改主题色彩
编辑 `tailwind.config.js` 中的theme.extend.colors：

```javascript
theme: {
  extend: {
    colors: {
      gold: '#你的金色',
      'space-black': '#你的黑色',
      // ... 其他颜色
    }
  }
}
```

## 📈 性能监控

- Lighthouse评分目标：
  - Performance: > 90
  - Accessibility: > 95
  - Best Practices: > 90
  - SEO: > 90

- Core Web Vitals目标：
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 LICENSE 文件了解详情

## 📞 联系我们

- 官网：https://gamden.proclaw.cc
- 邮箱：contact@gamden.com
- GitHub：https://github.com/BiglionX/GamDen
