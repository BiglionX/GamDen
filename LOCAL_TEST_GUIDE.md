# GamDen 本地测试指南

## 📋 前置条件检查

### 1. 必需软件
- ✅ Node.js >= 18.0.0
- ✅ MySQL >= 8.0
- ✅ Redis >= 6.0
- ⚠️ Docker（可选，用于容器化测试）

### 2. 检查安装
```bash
# 检查Node.js
node --version  # 应显示 v18.x.x 或更高

# 检查npm
npm --version  # 应显示 9.x.x 或更高

# 检查MySQL
mysql --version  # 应显示 mysql  Ver 8.x.x

# 检查Redis
redis-cli --version  # 应显示 redis-cli 6.x.x
```

---

## 🚀 本地测试步骤

### 步骤1：准备环境变量

1. 复制 `.env.example` 为 `.env`：
```bash
cd d:\GamDen
cp .env.example .env
```

2. 修改 `.env` 中的配置（根据您的本地环境）：
```env
# 数据库配置（修改为您的本地MySQL配置）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=gamden

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT密钥（测试环境可以使用简单密钥）
JWT_SECRET=test_secret_key_2026

# 其他配置保持默认值
```

### 步骤2：初始化数据库

1. 登录MySQL：
```bash
mysql -u root -p
```

2. 创建数据库：
```sql
CREATE DATABASE IF NOT EXISTS gamden 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

EXIT;
```

3. 导入Schema：
```bash
mysql -u root -p gamden < backend/sql/schema.sql
```

### 步骤3：安装依赖

**后端依赖**：
```bash
cd d:\GamDen\backend
npm install
```

**前端依赖**：
```bash
cd d:\GamDen\frontend
npm install
```

### 步骤4：启动服务

**启动MySQL服务**（Windows）：
```powershell
# 方法1：使用服务管理器
net start mysql

# 方法2：使用XAMPP/WAMP（如果安装了）
```

**启动Redis服务**（Windows）：
```powershell
# 如果有Redis Windows版本
redis-server.exe

# 或者使用Docker
docker run -d -p 6379:6379 redis:6.0
```

**启动后端服务**：
```bash
cd d:\GamDen\backend
npm run dev
```
- 后端将在 `http://localhost:3000` 启动
- 看到 "GamDen后端服务启动成功" 表示启动成功

**启动前端服务**：
```bash
cd d:\GamDen\frontend
npm run dev
```
- 前端将在 `http://localhost:3000` 启动（Next.js默认端口）
- 看到 "Ready in ..." 表示启动成功

---

## 🧪 测试核心流程

### 测试1：用户注册
1. 打开浏览器访问 `http://localhost:3000`
2. 点击 "注册" 按钮
3. 填写注册信息：
   - 手机号：13800138000
   - 密码：Test1234
   - 确认密码：Test1234
   - 邀请码：需要先手动创建一个邀请码（见下方说明）
   - 守护灵：选择任意一个
   - 昵称：测试用户
4. 点击 "注册" 按钮
5. 注册成功后会自动跳转到领地页面

**如何获取邀请码？**
- 方式1：先注册一个管理员账号，手动插入邀请码
- 方式2：暂时修改代码，跳过邀请码验证
- 方式3：使用SQL手动插入测试数据

### 测试2：用户登录
1. 访问 `http://localhost:3000/auth/login`
2. 输入手机号和密码
3. 点击 "登录"
4. 登录成功后会跳转到领地页面

### 测试3：领地系统
1. 登录后自动进入领地页面
2. 查看领地信息：
   - 领地等级
   - 经验值进度条
   - 金币余额
   - 领地坐标
3. 点击 "每日签到" 按钮
4. 查看邻居列表（目前应该是空的）

### 测试4：邀请好友
1. 点击顶部导航的 "邀请好友"
2. 查看您的邀请码
3. 点击 "复制" 按钮复制邀请码
4. 查看邀请进度

### 测试5：创建俱乐部
1. 点击顶部导航的 "俱乐部"
2. 点击 "创建俱乐部" 按钮
3. 填写俱乐部信息：
   - 名称：测试俱乐部
   - 游戏名称：原神
   - 描述：这是一个测试俱乐部
4. 点击 "创建"
5. 创建成功后可以在列表中看到

### 测试6：发帖
1. 点击俱乐部名称进入详情页
2. 在 "发布帖子" 表单中输入内容
3. 点击 "发布帖子"
4. 看到 "发帖成功，待审核" 提示

### 测试7：商城兑换
1. 点击顶部导航的 "商城"
2. 查看金币余额
3. 点击任意道具的 "兑换" 按钮
4. 确认兑换

### 测试8：守护灵
1. 点击顶部导航的 "守护灵"
2. 查看守护灵信息
3. 查看对话历史

---

## 🐛 常见问题排查

### 问题1：后端启动失败
**错误信息**：`ECONNREFUSED - Cannot connect to MySQL/Redis`

**解决方案**：
- 检查MySQL服务是否启动：`net start mysql`
- 检查Redis服务是否启动：`redis-cli ping`（应返回PONG）
- 检查 `.env` 中的数据库配置是否正确

### 问题2：前端启动失败
**错误信息**：`Port 3000 is already in use`

**解决方案**：
- 修改前端端口：在 `frontend/package.json` 中修改 `"dev": "next dev -p 3001"`
- 或者关闭占用3000端口的程序

### 问题3：注册失败
**错误信息**：`邀请码无效`

**解决方案**：
- 手动插入测试邀请码到数据库：
```sql
INSERT INTO users (phone, password_hash, nickname, guardian_type, invite_code, territory_coord_x, territory_coord_y)
VALUES ('13800138000', '$2b$10$hash...', '测试用户', 'mechanic', 'TEST01', 100, 200);
```

### 问题4：前端无法访问后端API
**错误信息**：`CORS error` 或 `Network Error`

**解决方案**：
- 检查后端是否启动在3000端口
- 检查前端 `.env.local` 中的 `NEXT_PUBLIC_API_URL` 是否设置为 `http://localhost:3000`
- 检查后端CORS配置是否允许前端域名

---

## 📊 测试检查清单

- [ ] 用户注册流程
- [ ] 用户登录流程
- [ ] 领地信息展示
- [ ] 每日签到功能
- [ ] 邻居列表展示
- [ ] 邀请码生成和复制
- [ ] 邀请进度查看
- [ ] 创建俱乐部
- [ ] 发帖功能
- [ ] 帖子列表展示
- [ ] 商城金币显示
- [ ] 道具兑换功能
- [ ] 守护灵信息展示
- [ ] 守护灵对话历史

---

## 🎯 下一步建议

### 选项1：继续本地测试和优化
- 修复测试中发现的问题
- 完善前端UI/UX
- 添加表单验证
- 优化错误提示

### 选项2：准备服务器部署
- 购买或准备服务器（腾讯云Lighthouse推荐）
- 配置服务器环境
- 执行远程部署

### 选项3：继续开发未完成功能
- 实现内容审核系统
- 实现小程序生成
- 实现野兽潮防御系统
- 集成OpenIM即时通讯

---

## 💡 快速测试命令

```bash
# 1. 初始化数据库
mysql -u root -p < backend/sql/schema.sql

# 2. 启动后端（新终端窗口）
cd backend && npm run dev

# 3. 启动前端（新终端窗口）
cd frontend && npm run dev

# 4. 访问应用
start http://localhost:3000
```

---

**准备好后，告诉我您希望执行哪个步骤，我会继续协助您！**
