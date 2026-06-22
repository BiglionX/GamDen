#!/bin/bash

# GamDen项目SSH一键部署脚本
# 作者: BiglionX
# 版本: 1.0
# 描述: 自动化部署GamDen游戏社区平台到远程服务器

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认配置
DEFAULT_SERVER_USER="root"
DEFAULT_SERVER_IP="43.160.220.131"
DEFAULT_PROJECT_DIR="/var/www/gamden"
DEFAULT_BACKEND_PORT="3001"
DEFAULT_FRONTEND_PORT="3000"
DEFAULT_MARKETING_PORT="3002"

# 显示帮助信息
show_help() {
    cat << EOF
GamDen项目SSH一键部署脚本

使用方法:
    ./ssh-deploy.sh [选项]

选项:
    -h, --help              显示此帮助信息
    -u, --user USER         服务器用户名 (默认: $DEFAULT_SERVER_USER)
    -i, --ip IP             服务器IP地址 (默认: $DEFAULT_SERVER_IP)
    -d, --dir DIRECTORY     项目部署目录 (默认: $DEFAULT_PROJECT_DIR)
    -b, --backend-port PORT 后端服务端口 (默认: $DEFAULT_BACKEND_PORT)
    -f, --frontend-port PORT 前端服务端口 (默认: $DEFAULT_FRONTEND_PORT)
    -m, --marketing-port PORT 营销网站端口 (默认: $DEFAULT_MARKETING_PORT)
    --skip-backend          跳过后端部署
    --skip-frontend         跳过前端部署
    --skip-marketing        跳过营销网站部署
    --skip-database         跳过数据库设置
    --production            生产环境模式
    --dry-run               预览模式，不实际执行

示例:
    ./ssh-deploy.sh                                    # 使用默认配置部署
    ./ssh-deploy.sh -u admin -i 192.168.1.100        # 指定服务器信息
    ./ssh-deploy.sh --production --skip-database       # 生产环境，跳过数据库
    ./ssh-deploy.sh --dry-run                          # 预览部署步骤

EOF
}

# 解析命令行参数
SERVER_USER="$DEFAULT_SERVER_USER"
SERVER_IP="$DEFAULT_SERVER_IP"
PROJECT_DIR="$DEFAULT_PROJECT_DIR"
BACKEND_PORT="$DEFAULT_BACKEND_PORT"
FRONTEND_PORT="$DEFAULT_FRONTEND_PORT"
MARKETING_PORT="$DEFAULT_MARKETING_PORT"
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_MARKETING=false
SKIP_DATABASE=false
PRODUCTION=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--user)
            SERVER_USER="$2"
            shift 2
            ;;
        -i|--ip)
            SERVER_IP="$2"
            shift 2
            ;;
        -d|--dir)
            PROJECT_DIR="$2"
            shift 2
            ;;
        -b|--backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        -f|--frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        -m|--marketing-port)
            MARKETING_PORT="$2"
            shift 2
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-marketing)
            SKIP_MARKETING=true
            shift
            ;;
        --skip-database)
            SKIP_DATABASE=true
            shift
            ;;
        --production)
            PRODUCTION=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done