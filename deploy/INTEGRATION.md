# GamDen部署系统集成说明

## 🎯 概述

本文档说明如何将SSH一键部署系统集成到现有项目中，并为其他IDE提供无缝的部署体验。

## 📦 已创建的部署文件

### 核心部署脚本
- `deploy/scripts/ssh-deploy-main.sh` - SSH部署主脚本
- `deploy/scripts/ssh-deploy.sh` - SSH部署基础配置
- `deploy/scripts/ssh-deploy-core.sh` - SSH部署核心功能
- `deploy/scripts/ssh-deploy-build.sh` - SSH部署构建功能
- `deploy/scripts/setup-ssh-keys.sh` - SSH密钥配置助手
- `deploy/scripts/ssh-deploy.ps1` - Windows PowerShell版本

### 便捷入口脚本
- `deploy/deploy.sh` - 多功能部署入口脚本
- `deploy/quick-start.sh` - 快速开始向导脚本

### 配置文件和模板
- `deploy/configs/deploy-config.example.yml` - 部署配置模板
- `deploy/templates/docker-compose.remote.yml` - 远程Docker部署模板
- `deploy/README.md` - 部署系统完整文档

## 🔧 IDE集成配置

### VS Code集成

在项目根目录创建 `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Setup SSH Keys",
      "type": "shell",
      "command": "${workspaceFolder}/deploy/scripts/setup-ssh-keys.sh",
      "args": ["all", "root", "43.160.220.131", "gamden"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Deploy to Server",
      "type": "shell",
      "command": "${workspaceFolder}/deploy/scripts/ssh-deploy-main.sh",
      "args": ["--production"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": [],
      "dependsOrder": "sequence",
      "dependsOn": ["Setup SSH Keys"]
    },
    {
      "label": "Quick Start Deploy",
      "type": "shell",
      "command": "${workspaceFolder}/deploy/quick-start.sh",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": true,
        "panel": "dedicated"
      },
      "problemMatcher": []
    }
  ]
}
```

创建 `.vscode/launch.json` 用于调试部署过程:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Deploy Script",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/deploy/scripts/ssh-deploy-main.sh",
      "runtimeArgs": ["--dry-run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm等)

创建文件关联和操作配置：

1. **File Associations**: 将 `.sh` 文件关联到 Bash
2. **External Tools**: 添加外部工具

**External Tools配置**:
- Name: `Deploy GamDen`
- Program: `$ProjectFileDir$/deploy/scripts/ssh-deploy-main.sh`
- Arguments: `--production`
- Working directory: `$ProjectFileDir$`
- Output filters: `$FILE_PATH$\($LINE$,$COLUMN$\):\s*$MESSAGE$`

### GitLab CI/CD集成

在项目根目录创建 `.gitlab-ci.yml`:

```yaml
stages:
  - deploy

deploy_production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client rsync
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan $DEPLOY_SERVER >> ~/.ssh/known_hosts
  script:
    - ./deploy/scripts/ssh-deploy-main.sh --production --skip-database
  only:
    - main
  environment:
    name: production
    url: https://your-domain.com
  variables:
    DEPLOY_SERVER: "43.160.220.131"
    SSH_PRIVATE_KEY: $SSH_PRIVATE_KEY
```

### GitHub Actions集成

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup SSH
      uses: webfactory/ssh-agent@v0.7.0
      with:
        ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
    
    - name: Deploy to server
      env:
        SSH_AUTH_SOCK: /tmp/ssh_agent.sock
      run: |
        chmod +x deploy/scripts/ssh-deploy-main.sh
        ./deploy/scripts/ssh-deploy-main.sh --production --skip-database
```

## 🚀 一键部署命令

### 为其他开发者提供的快捷命令

将以下内容添加到项目的 `package.json`:

```json
{
  "scripts": {
    "deploy:setup": "deploy/scripts/setup-ssh-keys.sh all root 43.160.220.131 gamden",
    "deploy:quick": "deploy/quick-start.sh",
    "deploy:prod": "deploy/scripts/ssh-deploy-main.sh --production",
    "deploy:dry-run": "deploy/scripts/ssh-deploy-main.sh --dry-run",
    "deploy:help": "deploy/scripts/ssh-deploy-main.sh --help"
  }
}
```

现在其他开发者可以使用熟悉的npm命令：

```bash
npm run deploy:quick      # 启动快速部署向导
npm run deploy:prod       # 生产环境部署
npm run deploy:dry-run    # 预览部署步骤
npm run deploy:setup      # 仅配置SSH密钥
```

## 📋 部署检查清单

提供给团队成员的部署检查清单：

### 部署前检查
- [ ] 确认服务器SSH密钥已配置
- [ ] 检查服务器磁盘空间 (>1GB)
- [ ] 确认服务器内存充足 (>512MB)
- [ ] 验证Node.js版本兼容性 (>=18.0.0)
- [ ] 检查网络连接稳定性

### 部署过程监控
- [ ] SSH连接测试通过
- [ ] 项目文件传输完成
- [ ] 依赖安装成功
- [ ] 项目构建无错误
- [ ] 服务启动正常
- [ ] 健康检查通过

### 部署后验证
- [ ] 前端应用可访问
- [ ] 营销网站可访问
- [ ] 后端API响应正常
- [ ] 数据库连接正常
- [ ] 日志文件正常生成

## 🔄 自动化部署流程

### 推荐的部署流程

1. **开发阶段**
   ```bash
   # 本地开发和测试
   npm run dev          # 启动开发服务器
   npm run test         # 运行测试
   ```

2. **预发布阶段**
   ```bash
   # 构建和预览
   npm run build        # 构建所有项目
   npm run deploy:dry-run  # 预览部署步骤
   ```

3. **生产部署**
   ```bash
   # 一键部署
   npm run deploy:quick  # 交互式部署向导
   # 或直接部署
   npm run deploy:prod   # 生产环境部署
   ```

## 🛡️ 安全和权限管理

### SSH密钥管理最佳实践

1. **密钥生成**
   - 使用强密码保护私钥
   - 定期轮换密钥
   - 使用不同的密钥对用于不同环境

2. **服务器配置**
   - 禁用密码登录 (`PasswordAuthentication no`)
   - 限制SSH用户访问
   - 使用fail2ban防止暴力破解

3. **权限控制**
   - 设置适当的文件和目录权限
   - 使用非root用户运行服务
   - 定期审计SSH访问日志

## 📞 故障排除和支持

### 常见问题快速解决

1. **SSH连接被拒绝**
   ```bash
   # 检查SSH服务状态
   ssh user@server "sudo systemctl status ssh"
   
   # 检查防火墙规则
   ssh user@server "sudo ufw status"
   ```

2. **权限不足错误**
   ```bash
   # 修复目录权限
   ssh user@server "sudo chown -R www-data:www-data /var/www/gamden"
   ```

3. **服务启动失败**
   ```bash
   # 查看服务日志
   ssh user@server "sudo journalctl -u gamden-backend -f"
   ```

### 获取帮助

- 📖 详细文档: `deploy/README.md`
- 🔧 部署向导: `./deploy/quick-start.sh`
- 🆘 在线支持: 项目Issues页面
- 💬 社区支持: 项目讨论区

## 🎉 部署成功庆祝

部署成功后的推荐操作：

1. **验证所有服务正常运行**
2. **更新项目文档中的部署信息**
3. **通知团队成员部署完成**
4. **监控系统性能和日志**
5. **备份部署配置**

---

**🚀 Happy Deploying! 让部署变得简单而愉快!**