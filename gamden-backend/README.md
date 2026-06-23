# GamDen Backend (NestJS)

GamDen 游戏巢穴社区的 NestJS 业务后台。

> 完整产品/技术方案见 [`docs/GamDen App V1.0 技术架构与产品需求说明书.md`](../docs/GamDen%20App%20V1.0%20技术架构与产品需求说明书.md)

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | NestJS 10 |
| 语言 | TypeScript 5 |
| 数据库 | PostgreSQL 14+ |
| ORM | TypeORM |
| 缓存 | Redis 6+（ioredis） |
| 认证 | JWT（passport-jwt） |
| 校验 | class-validator / class-transformer |
| 日志 | Winston |

## 模块划分

```
src/modules/
├── auth/        # JWT 注册/登录/刷新 token
├── user/        # 个人中心（me、profile）
├── territory/   # 领地（注册时随机坐标分配、邻居查询）
├── invite/      # 邀请码（生成、验证、邀请统计）
├── club/        # 俱乐部（CRUD）
├── market/      # 集市（虚拟道具、金币兑换）
└── agent/       # 代理/运营（预留）
```

## 快速开始

### 环境要求
- Node.js ≥ 18
- PostgreSQL ≥ 14
- Redis ≥ 6

### 启动
```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量模板
cp .env.example .env

# 3. 启动开发服务（热重载）
npm run start:dev

# 4. 构建生产产物
npm run build
npm run start:prod
```

服务默认运行在 `http://localhost:3000/api/v1`。

## 数据库初始化

V1.0 使用 TypeORM `synchronize: true` 自动建表（开发环境）。生产环境必须关闭并使用 migrations。

手动建库：
```sql
CREATE DATABASE gamden ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8';
```

## API 端点（V1.0）

### 认证（无需 token）
- `POST /api/v1/auth/register` - 注册（含邀请码 + 守护灵选择）
- `POST /api/v1/auth/login`    - 登录（手机号 + 短信码 / 密码）
- `POST /api/v1/auth/refresh`  - 刷新 access token

### 用户（需 token）
- `GET  /api/v1/users/me`       - 获取当前用户信息
- `PATCH /api/v1/users/me`     - 更新昵称/头像

### 领地
- `GET  /api/v1/territories/me`            - 我的领地
- `GET  /api/v1/territories/:id`           - 领地详情
- `GET  /api/v1/territories/:id/neighbors` - 查询周围 ±10 格邻居

### 邀请
- `POST /api/v1/invites`            - 生成新邀请码
- `GET  /api/v1/invites/me`         - 我的邀请码 + 进度

### 俱乐部
- `GET  /api/v1/clubs`              - 俱乐部列表
- `POST /api/v1/clubs`              - 创建俱乐部
- `GET  /api/v1/clubs/:id`          - 俱乐部详情

### 集市
- `GET  /api/v1/market/items`       - 道具列表
- `POST /api/v1/market/exchange`    - 兑换道具（金币）

## 项目结构

```
gamden-backend/
├── src/
│   ├── main.ts                   # 启动入口
│   ├── app.module.ts             # 根模块
│   ├── config/                   # 配置层（数据库/Redis/JWT）
│   ├── common/                   # 公共基础设施
│   │   ├── guards/               # JWT / Roles
│   │   ├── interceptors/         # 响应转换 / 日志
│   │   ├── filters/              # 全局异常过滤
│   │   ├── decorators/          # CurrentUser / Roles
│   │   └── dto/                 # Pagination / ApiResponse
│   ├── entities/                 # TypeORM 实体
│   └── modules/                  # 业务模块
└── test/                         # E2E 测试（占位）
```

## License

MIT
