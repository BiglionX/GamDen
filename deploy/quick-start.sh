#!/bin/bash

# GamDen项目快速开始部署脚本
# 一键完成从环境检查到部署的全流程

set -e

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

# 检查是否在项目根目录
check_project_root() {
    if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        log_error "请在GamDen项目根目录下运行此脚本"
        exit 1
    fi
}

# 一键SSH密钥配置
auto_setup_ssh() {
    log_info "开始自动SSH密钥配置..."
    
    local deploy_script="deploy/scripts/setup-ssh-keys.sh"
    
    if [ ! -f "$deploy_script" ]; then
        log_error "部署脚本不存在，请检查项目完整性"
        exit 1
    fi
    
    # 给脚本执行权限
    chmod +x "$deploy_script"
    
    # 询问服务器信息
    echo
    read -p "请输入服务器IP地址 [默认: 43.160.220.131]: " server_ip
    server_ip=${server_ip:-43.160.220.131}
    
    read -p "请输入服务器用户名 [默认: root]: " server_user
    server_user=${server_user:-root}
    
    read -p "请输入SSH配置别名 [默认: gamden-server]: " config_name
    config_name=${config_name:-gamden-server}
    
    # 执行完整SSH配置流程
    log_info "执行SSH密钥配置流程..."
    ./"$deploy_script" all "$server_user" "$server_ip" "$config_name"
    
    log_success "SSH密钥配置完成!"
}

# 一键部署
auto_deploy() {
    log_info "开始一键部署..."
    
    local deploy_script="deploy/scripts/ssh-deploy-main.sh"
    
    if [ ! -f "$deploy_script" ]; then
        log_error "部署脚本不存在，请检查项目完整性"
        exit 1
    fi
    
    # 给脚本执行权限
    chmod +x "$deploy_script"
    chmod +x deploy/deploy.sh
    
    # 预览部署步骤
    log_info "预览部署步骤..."
    ./"$deploy_script" --dry-run
    
    echo
    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 执行部署
        ./"$deploy_script"
    else
        log_info "部署已取消"
    fi
}

# 主菜单
show_main_menu() {
    echo
    echo "==========================================="
    echo "    GamDen项目快速开始部署向导"
    echo "==========================================="
    echo "1) 自动配置SSH密钥"
    echo "2) 一键部署到服务器"
    echo "3) 仅配置SSH密钥"
    echo "4) 仅执行部署"
    echo "5) 查看部署文档"
    echo "6) 环境检查"
    echo "0) 退出"
    echo "==========================================="
    echo
}

# 环境检查
check_environment() {
    log_info "检查部署环境..."
    
    echo
    echo "系统信息:"
    echo "  OS: $(uname -s)"
    echo "  Arch: $(uname -m)"
    echo "  Shell: $SHELL"
    
    echo
    echo "必要工具检查:"
    
    local tools=("ssh" "scp" "tar" "curl" "node" "npm")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            echo "  ✓ $tool: $(command -v $tool)"
        else
            echo "  ✗ $tool: 未找到"
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        log_success "环境检查通过!"
    else
        log_warning "缺少工具: ${missing_tools[*]}"
        echo
        log_info "请安装缺少的工具后再继续"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 主函数
main() {
    check_project_root
    
    while true; do
        show_main_menu
        read -p "请选择操作 (0-6): " choice
        
        case $choice in
            1)
                auto_setup_ssh
                ;;
            2)
                auto_setup_ssh
                auto_deploy
                ;;
            3)
                auto_setup_ssh
                ;;
            4)
                auto_deploy
                ;;
            5)
                if [ -f "deploy/README.md" ]; then
                    less "deploy/README.md"
                else
                    log_info "部署文档不存在"
                fi
                ;;
            6)
                check_environment
                ;;
            0)
                log_info "退出快速开始向导"
                exit 0
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
        
        echo
        read -p "按回车键返回主菜单..."
    done
}

# 脚本入口
main