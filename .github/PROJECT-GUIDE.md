# GamDen V1.0 - GitHub Project 使用指南

## 快速开始

### 方式一：使用 Node.js 脚本（推荐，自动创建 Project + Issues）

```bash
# 1. 安装依赖（仅需 node 内置 https 模块，无需额外安装）

# 2. 设置环境变量
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_OWNER="your-username"
export GITHUB_REPO="GamDen"

# 3. 运行脚本
node .github/scripts/create-project.js
```

**Token 权限要求**：`project:write`, `repo`, `admin:org` (如适用)

---

### 方式二：使用 GitHub CLI（需先手动创建 Project）

```bash
# 1. 安装并登录 GitHub CLI
# macOS: brew install gh
# Windows: winget install GitHub.cli
gh auth login

# 2. 手动创建 Project（浏览器操作）
# 进入 https://github.com/users/YOUR_USERNAME/projects 点击 New project
# 选择 "Board" 模板，命名为 "GamDen V1.0 开发看板"

# 3. 运行批量创建 Issues 脚本
bash .github/scripts/create-issues.sh
```

---

### 方式三：手动创建（无需任何工具）

直接复制下方 Issue 清单，在 GitHub 仓库手动创建 Issues，然后添加到 Project 看板。

---

## Issues 清单（共 57 个）

### 🔷 阶段一：基础设施与基础模块（8个）

| # | Issue | 标签 |
|---|-------|------|
| 1 | [P0] 项目初始化 - Monorepo结构搭建 | `P0`, `infra` |
| 2 | [P0] 数据库初始化 - 建表SQL执行 | `P0`, `backend`, `database` |
| 3 | [P0] 认证模块API - 注册/登录/JWT | `P0`, `backend`, `api` |
| 4 | [P0] 邀请码生成与校验逻辑 | `P0`, `backend` |
| 5 | [P0] 坐标分配算法实现 | `P0`, `backend`, `algorithm` |
| 6 | [P1] 环境变量与配置文件 | `P1`, `infra`, `config` |
| 7 | [P1] Docker Compose 容器编排 | `P1`, `infra`, `docker` |
| 8 | [P1] 统一错误码体系 | `P1`, `backend` |

### 🔷 阶段二：核心玩法功能（9个）

| # | Issue | 标签 |
|---|-------|------|
| 9 | [P0] 领地信息API | `P0`, `backend`, `api` |
| 10 | [P0] 领地升级逻辑与经验系统 | `P0`, `backend` |
| 11 | [P0] 地图邻居API | `P0`, `backend`, `api` |
| 12 | [P0] 守护灵话术系统 | `P0`, `backend`, `agent` |
| 13 | [P0] Agent通知推送（OpenIM自定义消息） | `P0`, `backend`, `openim` |
| 14 | [P1] 签到功能 | `P1`, `backend`, `feature` |
| 15 | [P1] 野兽潮定时任务 | `P1`, `backend`, `feature` |
| 16 | [P1] 野兽潮配置后台接口 | `P1`, `backend`, `config` |
| 17 | [P1] 领地元素图资源上传 | `P1`, `assets` |

### 🔷 阶段三：邀请裂变与社交（8个）

| # | Issue | 标签 |
|---|-------|------|
| 18 | [P0] 邀请记录API与进度接口 | `P0`, `backend`, `api` |
| 19 | [P0] OpenIM Docker部署与基础对接 | `P0`, `infra`, `openim` |
| 20 | [P0] OpenIM Webhook中间件 | `P0`, `backend`, `openim` |
| 21 | [P0] 单聊/群聊基础功能接入 | `P0`, `frontend`, `openim` |
| 22 | [P1] 俱乐部（贴吧）API | `P1`, `backend`, `api` |
| 23 | [P1] 俱乐部对应OpenIM群组 | `P1`, `backend`, `openim` |
| 24 | [P1] 腾讯云内容安全API接入 - AI初审 | `P1`, `backend`, `security` |
| 25 | [P1] 人工复审池后台接口 | `P1`, `backend` |

### 🔷 阶段四：商城与后台管理（9个）

| # | Issue | 标签 |
|---|-------|------|
| 26 | [P0] 金币系统完善 | `P0`, `backend`, `feature` |
| 27 | [P0] 商城兑换API | `P0`, `backend`, `api` |
| 28 | [P0] 后台管理 - 用户管理页面 | `P0`, `admin`, `frontend` |
| 29 | [P0] 后台管理 - 内容审核页面 | `P0`, `admin`, `frontend` |
| 30 | [P1] 后台管理 - 领地与地图监控 | `P1`, `admin`, `frontend` |
| 31 | [P1] 后台管理 - 俱乐部管理 | `P1`, `admin`, `frontend` |
| 32 | [P1] 后台管理 - 数据看板 | `P1`, `admin`, `frontend` |
| 33 | [P1] 后台管理 - 系统配置页面 | `P1`, `admin`, `frontend` |
| 34 | [P1] 操作日志API与查看页面 | `P1`, `backend`, `admin` |

### 🔷 阶段五：营销H5与小程序（9个）

| # | Issue | 标签 |
|---|-------|------|
| 35 | [P0] 营销H5首屏页面 | `P0`, `frontend`, `h5` |
| 36 | [P0] H5申请表单页 | `P0`, `frontend`, `h5` |
| 37 | [P0] H5审核流程（自动+手动） | `P0`, `backend`, `h5` |
| 38 | [P0] H5邀请码输入与App下载页 | `P0`, `frontend`, `h5` |
| 39 | [P0] 微信小程序 - 领地展示页 | `P0`, `frontend`, `miniprogram` |
| 40 | [P0] 微信小程序 - 分享功能 | `P0`, `frontend`, `miniprogram` |
| 41 | [P0] 微信小程序 - 引流策略 | `P0`, `frontend`, `miniprogram` |
| 42 | [P1] 小程序自动生成逻辑 | `P1`, `backend`, `miniprogram` |
| 43 | [P1] 数据统计埋点 | `P1`, `backend`, `analytics` |

### 🔷 阶段六：App多端开发（7个）

| # | Issue | 标签 |
|---|-------|------|
| 44 | [P0] iOS App - 登录/注册/领地主页（SwiftUI） | `P0`, `ios`, `frontend` |
| 45 | [P0] iOS App - 地图/俱乐部/IM/商城/个人中心 | `P0`, `ios`, `frontend` |
| 46 | [P0] Android App - 全功能（React Native） | `P0`, `android`, `frontend` |
| 47 | [P1] App全面屏适配 | `P1`, `ios`, `android`, `ui` |

> 注：iOS 和 Android 各功能模块已合并为统一个 Issue，开发时可拆分为子任务。

### 🔷 阶段七：测试与部署（6个）

| # | Issue | 标签 |
|---|-------|------|
| 48 | [P0] 接口联调与Postman自动化测试 | `P0`, `test` |
| 49 | [P0] 功能测试 - 完整用户路径走通 | `P0`, `test` |
| 50 | [P1] 性能测试 | `P1`, `test`, `performance` |
| 51 | [P1] 安全测试 | `P1`, `test`, `security` |
| 52 | [P0] Lighthouse部署 - docker compose up | `P0`, `devops`, `deploy` |
| 53 | [P1] 监控接入 - Sentry + Prometheus | `P1`, `devops`, `monitoring` |

---

## Project 看板列设置

在 GitHub Project 中建议设置以下列（视图 → 配置字段 → 添加列）：

| 列名 | 说明 | 对应状态 |
|------|------|----------|
| 📋 待规划 | 尚未开始的任务 | `待规划` |
| 🔄 进行中 | 正在开发的任务 | `进行中` |
| 👀 待评审 | 开发完成，等待 Code Review | `待评审` |
| ✅ 已完成 | 已合并到 main | `已完成` |
| 🚫 已阻塞 | 被依赖项阻塞 | `已阻塞` |

---

## Labels 创建脚本

在仓库中运行以下命令批量创建标签：

```bash
# P0~P3 优先级标签
gh label create "P0" --color "E8484C" --description "核心阻塞"
gh label create "P1" --color "FF8A00" --description "高优先级"
gh label create "P2" --color "FFD600" --description "中优先级"
gh label create "P3" --color "28A745" --description "低优先级"

# 功能模块标签
for label in infra backend frontend admin ios android api security database docker openim agent territory map club shop moderation analytics monitoring devops test; do
  gh label create "$label" --color "0969DA"
done
```

---

## 里程碑（Milestones）设置

建议在 GitHub 仓库创建以下里程碑：

| 里程碑 | Due Date | 说明 |
|--------|----------|------|
| v1.0-alpha | Week 3 | 基础设施完成，用户可注册登录 |
| v1.0-beta | Week 7 | 核心玩法完成，领地升级+地图 |
| v1.0-rc | Week 13 | 商城+后台完成，功能完整 |
| v1.0-release | Week 17 | 正式上线 |

---

## 自动化建议

### 1. 自动关闭 Issue

在 PR 描述中添加 `Closes #123` 或 `Fixes #123`，合并后自动关闭对应 Issue。

### 2. Branch 命名规范

```
feature/territory-api
feature/openim-webhook
fix/login-jwt-refresh
chore/docker-compose
```

### 3. Issue 模板

在 `.github/ISSUE_TEMPLATE/` 下创建 `feature.md` 和 `bug.md`。
