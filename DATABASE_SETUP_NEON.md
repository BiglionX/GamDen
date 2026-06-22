# GamDen + Neon PostgreSQL 配置指南

## 🚀 快速开始

### 步骤1：注册Neon账号

1. 访问 https://neon.tech/
2. 点击 "Sign Up" 注册（可以用GitHub登录）
3. 登录后，点击 "Create a project"

### 步骤2：创建项目

1. **Project name**: `gamden-dev`
2. **Database name**: `gamden`
3. **Region**: 选择最近的地区（推荐：`Singapore SE Asia`）
4. **PostgreSQL version**: 选择最新版本（如16）
5. 点击 "Create project"

### 步骤3：获取连接字符串

创建成功后，会显示连接信息：

```
postgresql://[user]:[password]@[neon_host]/[database]?sslmode=require
```

**示例**：
```
postgresql://gamden_owner:AbCdEfGh1234@ep-cool-dark-123456.us-east-2.aws.neon.tech/gamden?sslmode=require
```

**⚠️ 重要**：
- 立即复制这个连接字符串！
- 密码只显示一次，请妥善保存
- 如果忘记密码，可以在Neon控制台重置

### 步骤4：配置 `.env` 文件

打开 `d:\GamDen\.env`，修改数据库配置：

```env
# 数据库配置（修改为Neon）
DB_TYPE=postgres
DB_URL=postgresql://gamden_owner:YOUR_PASSWORD@YOUR_NEON_HOST/gamden?sslmode=require

# 或者分开配置
DB_HOST=YOUR_NEON_HOST（如：ep-cool-dark-123456.us-east-2.aws.neon.tech）
DB_PORT=5432
DB_USER=gamden_owner
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=gamden

# 其他配置保持不变...
```

### 步骤5：转换数据库Schema

**问题**：当前Schema是MySQL语法，需要转换为PostgreSQL。

**解决方案**：我会帮您创建一个PostgreSQL版本的Schema。

---

## 📝 PostgreSQL版本Schema（待创建）

我会将 `backend/sql/schema.sql` 转换为PostgreSQL语法：

**主要变化**：
1. `AUTO_INCREMENT` → `SERIAL` 或 `GENERATED ALWAYS AS IDENTITY`
2. `ENGINE=InnoDB` → 删除（PostgreSQL不需要）
3. `COMMENT` 语法调整
4. 数据类型调整（`TINYINT` → `SMALLINT` 等）
5. 字符串函数调整（`CHAR_LENGTH` → `LENGTH` 等）

---

## 🔧 测试连接

### 方法1：使用psql命令行

```bash
# 安装PostgreSQL客户端（如果没有）
# Windows: https://www.postgresql.org/download/windows/

# 测试连接
psql "postgresql://gamden_owner:YOUR_PASSWORD@YOUR_NEON_HOST/gamden?sslmode=require"
```

### 方法2：使用pgAdmin（图形界面）

1. 下载并安装pgAdmin：https://www.pgadmin.org/download/
2. 添加新服务器
3. 输入Neon连接信息
4. 测试连接

### 方法3：使用Neon Web控制台

直接在浏览器中：
1. 登录 https://console.neon.tech/
2. 选择您的项目
3. 点击 "SQL Editor"
4. 可以直接执行SQL命令

---

## 🎯 下一步

请告诉我：

1. **您是否已经注册了Neon并创建了项目？**
   - ✅ 是 → 把连接字符串发给我（可以隐藏密码）
   - ❌ 否 → 我可以等您创建好

2. **您希望我立即做什么？**
   - **A**: 我先创建PostgreSQL版本的Schema
   - **B**: 我先修改后端代码，支持PostgreSQL连接
   - **C**: 我等您提供Neon连接信息后再继续

---

## 💡 推荐流程

1. ✅ 您注册Neon并创建项目（5分钟）
2. ✅ 您复制连接字符串（1分钟）
3. ✅ 我修改代码和Schema（10分钟）
4. ✅ 我们测试数据库连接（5分钟）
5. ✅ 我们导入Schema（2分钟）
6. ✅ 我们启动后端并测试（5分钟）

**总计：约30分钟可以完成数据库配置！**

---

**准备好后，请告诉我您的Neon连接信息（可以隐藏密码部分），我会立即帮您修改代码！**
