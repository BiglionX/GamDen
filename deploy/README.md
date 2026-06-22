# GamDen项目SSH一键部署系统

## 🚀 概述

本项目提供了一套完整的SSH一键部署解决方案，支持将GamDen游戏社区平台快速部署到远程Linux服务器。

## 📁 文件结构

```
deploy/
├── README.md                           # 本文档
├── deploy.sh                            # 主入口脚本（支持多种部署方式）
├── configs/
│   └── deploy-config.example.yml        # 部署配置模板
└── scripts/
    ├── ssh-deploy-main.sh               # SSH部署主脚本
    ├── ssh-deploy.sh                    # SSH部署基础配置
    ├── ssh-deploy-core.sh               # SSH部署核心功能
    ├── ssh-deploy-build.sh              # SSH部署构建功能
    └── ssh-deploy.ps1                   # Windows PowerShell版本
```

## 🛠️ 快速开始

### 1. 环境准备

#### Linux/Mac环境
```bash
# 确保已安装必要工具
which ssh scp tar curl

# 如果没有安装，请使用包管理器安装
# Ubuntu/Debian:
sudo apt update && sudo apt install openssh-client git curl
```

#### Windows环境
- 安装 Git for Windows （包含ssh, scp等工具）
- 确保 Node.js 和 npm 已安装

### 2. SSH密钥配置

#### 生成SSH密钥（如果没有）
```bash
# 生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥复制到服务器
ssh-copy-id username@server_ip
```

### 3. 使用部署脚本

#### 方式一：使用主入口脚本（推荐）
```bash
cd d:/GamDen/deploy
chmod +x deploy.sh
./deploy.sh
```

#### 方式二：直接使用SSH部署脚本
```bash
cd d:/GamDen/deploy/scripts
chmod +x ssh-deploy-main.sh

# 使用默认配置部署
./ssh-deploy-main.sh

# 预览部署步骤
./ssh-deploy-main.sh --dry-run

# 指定服务器信息
./ssh-deploy-main.sh -u admin -i 192.168.1.100
```

## ⚙️ 配置说明

### 部署配置文件

复制配置模板并根据实际情况修改：

```bash
cp deploy/configs/deploy-config.example.yml deploy-config.yml
```

### 环境变量

敏感信息建议通过环境变量管理：

```bash
# 在本地设置环境变量
export GAMDEN_DB_PASSWORD="your_db_password"
export GAMDEN_JWT_SECRET="your_jwt_secret"
```

## 🎯 部署选项

### 命令行参数

| 参数 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| --user | -u | 服务器用户名 | root |
| --ip | -i | 服务器IP地址 | 43.160.220.131 |
| --dir | -d | 项目部署目录 | /var/www/gamden |
| --backend-port | -b | 后端服务端口 | 3001 |
| --frontend-port | -f | 前端服务端口 | 3000 |
| --marketing-port | -m | 营销网站端口 | 3002 |
| --skip-backend | | 跳过后端部署 | false |
| --skip-frontend | | 跳过前端部署 | false |
| --skip-marketing | | 跳过营销网站部署 | false |
| --skip-database | | 跳过数据库设置 | false |
| --production | | 生产环境模式 | false |
| --dry-run | | 预览模式 | false |
| --help | -h | 显示帮助 | |

## 📊 部署流程

1. **环境检查** - 验证SSH连接和必要工具
2. **目录创建** - 在服务器创建项目目录结构
3. **文件传输** - 打包并传输项目文件到服务器
4. **依赖安装** - 在服务器安装Node.js依赖
5. **项目构建** - 构建前端、后端和营销网站
6. **环境配置** - 配置生产环境变量
7. **服务配置** - 创建systemd服务文件
8. **服务启动** - 启动所有服务并设置开机自启

## 🔧 服务管理

部署完成后，可以使用以下命令管理服务：

```bash
# 查看服务状态
ssh username@server_ip 'sudo systemctl status gamden-*'

# 重启所有服务
ssh username@server_ip 'sudo systemctl restart gamden-*'

# 查看服务日志
ssh username@server_ip 'sudo journalctl -u gamden-backend -f'

# 停止所有服务
ssh username@server_ip 'sudo systemctl stop gamden-*'
```

## 🌐 访问地址

部署成功后，可以通过以下地址访问：

- **前端应用**: http://server_ip:3000
- **营销网站**: http://server_ip:3002  
- **后端API**: http://server_ip:3001/api/v1
- **API文档**: http://server_ip:3001/api/docs

生产环境下：
- **前端应用**: http://server_ip
- **营销网站**: http://server_ip:8080
- **后端API**: http://server_ip:8000/api/v1

## 🔍 故障排除

### SSH连接问题
```bash
# 检查SSH服务状态
ssh username@server_ip 'sudo systemctl status ssh'

# 检查防火墙设置
ssh username@server_ip 'sudo ufw status'
```

### 权限问题
```bash
# 确保脚本有执行权限
chmod +x deploy/scripts/*.sh

# 检查目录权限
ssh username@server_ip 'ls -la /var/www/gamden'
```

### 服务启动失败
```bash
# 查看详细错误日志
ssh username@server_ip 'sudo journalctl -u gamden-backend -xe'

# 检查端口占用
ssh username@server_ip 'sudo netstat -tlnp | grep :3001'
```

## 📝 开发指南

### 添加新的部署步骤

1. 在 `ssh-deploy-core.sh` 中添加新的功能函数
2. 在 `ssh-deploy-main.sh` 中调用该函数
3. 更新命令行参数解析（如果需要）
4. 更新文档和配置模板

### 自定义构建命令

修改 `deploy-config.example.yml` 中的 `build.commands` 部分：

```yaml
build:
  commands:
    backend: "npm run build:prod"
    frontend: "npm run build -- --mode production"
    marketing: "npm run export"
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进部署脚本！

## 📄 许可证

MIT License - 详见项目根目录 LICENSE 文件

## 📞 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 联系项目维护者

---

**Happy Deploying! 🚀**