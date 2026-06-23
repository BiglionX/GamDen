# GamDen 一键部署指南

## 🚀 最快方式：npm 命令

在任何 IDE 的终端中直接运行：

```bash
npm run deploy              # 拉取代码 → 构建 → 重启 → 验证
npm run deploy:skip-build   # 跳过构建（仅重启）
npm run deploy:status       # 查看服务器状态
```

**前提条件**：本地已配置 SSH 密钥到服务器 `43.160.220.131`。

---

## 🔑 配置 SSH 密钥（首次使用）

### Windows (PowerShell)
```powershell
# 生成密钥（如果还没有）
ssh-keygen -t ed25519 -C "your-email@example.com"

# 复制公钥到服务器
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@43.160.220.131 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Mac / Linux
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
ssh-copy-id root@43.160.220.131
```

### 测试连接
```bash
ssh root@43.160.220.131 "echo 连接成功"
```

---

## 🖥️ 各 IDE 集成方式

### VS Code
在项目根目录创建 `.vscode/tasks.json`：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🚀 部署到服务器",
      "type": "shell",
      "command": "ssh root@43.160.220.131 'bash /opt/GamDen/deploy/scripts/redeploy.sh'",
      "group": "build",
      "presentation": { "reveal": "always", "panel": "dedicated" }
    },
    {
      "label": "📊 查看服务器状态",
      "type": "shell",
      "command": "ssh root@43.160.220.131 'pm2 list'",
      "group": "test",
      "presentation": { "reveal": "always", "panel": "shared" }
    }
  ]
}
```

按 `Ctrl+Shift+P` → `Tasks: Run Task` → 选择 `🚀 部署到服务器`

### JetBrains (WebStorm / IntelliJ)
1. `Settings` → `Tools` → `SSH Configurations` → 添加服务器 `43.160.220.131`
2. `Settings` → `Tools` → `External Tools` → 添加：
   - **Name**: `GamDen Deploy`
   - **Program**: `ssh`
   - **Arguments**: `root@43.160.220.131 bash /opt/GamDen/deploy/scripts/redeploy.sh`
3. 右键项目 → `External Tools` → `GamDen Deploy`

### Cursor / Windsurf / 其他 AI IDE
终端中直接运行：
```bash
npm run deploy
```

---

## 🖥️ 直接 SSH 部署

```bash
# 标准部署
ssh root@43.160.220.131 'bash /opt/GamDen/deploy/scripts/redeploy.sh'

# 跳过 git pull（不拉新代码，仅重建）
ssh root@43.160.220.131 'SKIP_PULL=true bash /opt/GamDen/deploy/scripts/redeploy.sh'
```

---

## 📋 服务器环境

| 项目 | 详情 |
|------|------|
| IP | 43.160.220.131 |
| 营销网站 | PM2 (`gamden-marketing`), 端口 3002 |
| Nginx | Docker (`gamden-nginx`), 端口 80 |
| 项目路径 | `/opt/GamDen` |
| 访问地址 | http://43.160.220.131 |

---

## 🔧 手动操作

```bash
# 查看进程
ssh root@43.160.220.131 'pm2 list'

# 查看日志
ssh root@43.160.220.131 'pm2 logs gamden-marketing'

# 重启
ssh root@43.160.220.131 'pm2 restart gamden-marketing'

# 查看 Nginx
ssh root@43.160.220.131 'docker logs gamden-nginx'
```
