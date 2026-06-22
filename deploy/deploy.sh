#!/bin/bash

# GamDen项目一键部署入口脚本
# 这个脚本提供了多种部署方式的便捷入口

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "======================================"
echo "    GamDen项目部署工具"
echo "======================================"
echo "项目根目录: $PROJECT_ROOT"
echo "部署脚本目录: $SCRIPT_DIR"
echo "======================================"
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    local missing_deps=()
    
    # 检查必要工具
    command -v ssh >/dev/null 2>&1 || missing_deps+=("ssh")
    command -v scp >/dev/null 2>&1 || missing_deps+=("scp")
    command -v tar >/dev/null 2>&1 || missing_deps+=("tar")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必要依赖: ${missing_deps[*]}"
        log_info "请安装缺失的工具后重试"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 显示部署选项
show_deployment_options() {
    echo "请选择部署方式:"
    echo
    echo "1) SSH远程部署 (推荐)"
    echo "   将项目部署到远程Linux服务器"
    echo
    echo "2) Docker容器部署"
    echo "   使用Docker Compose本地或远程部署"
    echo
    echo "3) 本地开发环境启动"
    echo "   启动本地开发服务器"
    echo
    echo "4) 仅构建项目"
    echo "   构建所有项目但不部署"
    echo
    echo "5) 查看部署文档"
    echo "   查看详细的部署说明"
    echo
    echo "0) 退出"
    echo
}

# SSH远程部署
deploy_ssh() {
    log_info "启动SSH远程部署..."
    
    if [ ! -f "$SCRIPT_DIR/scripts/ssh-deploy-main.sh" ]; then
        log_error "SSH部署脚本不存在"
        exit 1
    fi
    
    # 给脚本执行权限
    chmod +x "$SCRIPT_DIR/scripts/ssh-deploy-main.sh"
    
    # 显示快速使用说明
    echo
    echo "快速部署命令示例:"
    echo "  $SCRIPT_DIR/scripts/ssh-deploy-main.sh                           # 使用默认配置"
    echo "  $SCRIPT_DIR/scripts/ssh-deploy-main.sh --dry-run              # 预览部署步骤"
    echo "  $SCRIPT_DIR/scripts/ssh-deploy-main.sh -i 192.168.1.100      # 指定服务器IP"
    echo "  $SCRIPT_DIR/scripts/ssh-deploy-main.sh --production           # 生产环境模式"
    echo "  $SCRIPT_DIR/scripts/ssh-deploy-main.sh --help                # 查看所有选项"
    echo
    
    # 询问是否继续
    read -p "是否现在启动SSH部署？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        exec "$SCRIPT_DIR/scripts/ssh-deploy-main.sh"
    fi
}

# Docker部署
deploy_docker() {
    log_info "启动Docker部署..."
    
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.yml不存在"
        exit 1
    fi
    
    echo
    echo "Docker部署选项:"
    echo "1) 本地Docker部署"
    echo "2) 远程Docker部署"
    echo "3) 构建镜像但不启动"
    echo
    read -p "请选择 (1-3): " docker_choice
    
    case $docker_choice in
        1)
            log_info "启动本地Docker部署..."
            cd "$PROJECT_ROOT"
            docker-compose up -d
            log_success "本地Docker部署完成"
            echo "访问地址: http://localhost"
            ;;
        2)
            read -p "请输入远程服务器IP: " remote_ip
            log_info "在远程服务器 $remote_ip 上部署Docker..."
            # 这里可以添加远程Docker部署逻辑
            log_warning "远程Docker部署功能开发中..."
            ;;
        3)
            log_info "构建Docker镜像..."
            cd "$PROJECT_ROOT"
            docker-compose build
            log_success "镜像构建完成"
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 本地开发环境启动
deploy_local() {
    log_info "启动本地开发环境..."
    
    echo
    echo "本地开发环境选项:"
    echo "1) 启动所有服务"
    echo "2) 仅启动后端"
    echo "3) 仅启动前端"
    echo "4) 仅启动营销网站"
    echo
    read -p "请选择 (1-4): " local_choice
    
    case $local_choice in
        1)
            log_info "启动所有开发服务..."
            cd "$PROJECT_ROOT"
            # 这里可以调用本地的启动脚本
            log_info "请手动启动各服务或使用现有的启动脚本"
            ;;
        2|3|4)
            log_info "单个服务启动功能开发中..."
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 仅构建项目
build_only() {
    log_info "开始构建项目..."
    
    cd "$PROJECT_ROOT"
    
    echo
    echo "构建选项:"
    echo "1) 构建所有项目"
    echo "2) 仅构建后端"
    echo "3) 仅构建前端"
    echo "4) 仅构建营销网站"
    echo
    read -p "请选择 (1-4): " build_choice
    
    case $build_choice in
        1)
            log_info "构建所有项目..."
            echo "构建后端..."
            cd backend && npm run build && cd ..
            echo "构建前端..."
            cd frontend && npm run build && cd ..
            echo "构建营销网站..."
            cd marketing-site && npm run build && cd ..
            log_success "所有项目构建完成"
            ;;
        2)
            cd backend && npm run build
            ;;
        3)
            cd frontend && npm run build
            ;;
        4)
            cd marketing-site && npm run build
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 查看部署文档
show_documentation() {
    log_info "打开部署文档..."
    
    local doc_files=(
        "$PROJECT_ROOT/docs/LOCAL_TEST_GUIDE.md"
        "$PROJECT_ROOT/DATABASE_SETUP_NEON.md"
        "$SCRIPT_DIR/README.md"
    )
    
    for doc in "${doc_files[@]}"; do
        if [ -f "$doc" ]; then
            echo "找到文档: $doc"
            if command -v less >/dev/null 2>&1; then
                less "$doc"
            elif command -v cat >/dev/null 2>&1; then
                cat "$doc"
            fi
            echo
        fi
    done
    
    # 如果没有找到文档，显示基本说明
    if [ ! -f "$SCRIPT_DIR/README.md" ]; then
        echo "部署说明:"
        echo "1. SSH部署: 使用 deploy/scripts/ssh-deploy-main.sh 脚本"
        echo "2. Docker部署: 使用 docker-compose up -d"
        echo "3. 详细文档请查看项目根目录下的docs文件夹"
    fi
}

# 主菜单
main_menu() {
    while true; do
        show_deployment_options
        read -p "请输入选择 (0-5): " choice
        
        case $choice in
            1)
                deploy_ssh
                break
                ;;
            2)
                deploy_docker
                break
                ;;
            3)
                deploy_local
                break
                ;;
            4)
                build_only
                break
                ;;
            5)
                show_documentation
                ;;
            0)
                log_info "退出部署工具"
                exit 0
                ;;
            *)
                log_error "无效选择，请重新输入"
                echo
                ;;
        esac
    done
}

# 脚本入口
check_dependencies
main_menu