# GamDen - 游戏巢穴社区

一个独立于算法的游戏社交平台——玩家通过邀请码入驻获得专属领地，在AI守护灵引导下建立游戏社交圈。

## 项目结构

```
GamDen/
├── backend/              # 后端API（Node.js + Express + TypeScript）
├── frontend/            # 前端应用（Next.js + React）
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

### 生产部署

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
