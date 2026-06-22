# GamDen - 游戏巢穴社区

一个独立于算法的游戏社交平台——玩家通过邀请码入驻获得专属领地，在AI守护灵引导下建立游戏社交圈。

## 项目结构

```
GamDen/
├── backend/              # 后端API（Node.js + Express + TypeScript）
├── frontend/            # 前端应用（Next.js + React）
├── marketing-site/      # 营销网站（Next.js + React）
├── deploy/              # 一键部署系统脚本和配置
├── docs/                # 项目文档
├── docker-compose.yml    # Docker编排配置
└── .env                 # 环境变量配置
```

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **前端**: Next.js + React + TypeScript
- **数据库**: MySQL 8.0
- **缓存**: Redis 6.0
- **即时通讯**: OpenIM Server
- **部署**: Docker + Docker Compose
- **服务器**: 腾讯云Lighthouse（新加坡）

## 快速开始

### 前置条件

- Node.js >= 18.0.0
- Docker >= 20.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd frontend && npm install
```

### 开发模式

```bash
# 启动后端开发服务器
npm run dev:backend

# 启动前端开发服务器
npm run dev:frontend
```

### 🚀 一键SSH部署 (推荐)

项目提供完整的SSH一键部署系统，支持快速将项目部署到远程服务器：

```bash
# 启动快速部署向导（推荐首次使用）
./deploy/quick-start.sh

# 或直接部署到服务器
./deploy/scripts/ssh-deploy-main.sh

# Windows用户使用PowerShell
.\deploy\scripts\ssh-deploy.ps1
```

**npm快捷命令：**
```bash
npm run deploy:setup      # 配置SSH密钥
npm run deploy:quick      # 启动部署向导
npm run deploy:prod       # 生产环境部署
npm run deploy:dry-run    # 预览部署步骤
```

详细部署文档请查看 [deploy/README.md](./deploy/README.md) 和 [deploy/INTEGRATION.md](./deploy/INTEGRATION.md)

### 生产部署 (Docker)

```bash
# 使用Docker Compose部署
docker compose up -d --build
```

## 环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

## 文档

- [产品需求说明书](./docs/产品需求说明书（PRD）- V1.0 游戏巢穴社区.md)
- [技术架构与接口文档](./docs/技术架构与接口文档 - V1.0.md)
- [后台管理系统需求](./docs/后台管理系统需求 - V1.0 运营基础版.md)

## 开发计划

- [x] 项目初始化
- [ ] 数据库设计
- [ ] 后端API开发
- [ ] 前端开发
- [ ] OpenIM集成
- [ ] 部署配置

## License

MIT
