#!/bin/bash

# SSH密钥设置助手脚本
# 帮助快速配置SSH密钥认证

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

# 检查必要工具
check_prerequisites() {
    log_info "检查必要工具..."
    
    local missing_tools=()
    
    if ! command -v ssh-keygen >/dev/null 2>&1; then
        missing_tools+=("ssh-keygen")
    fi
    
    if ! command -v ssh-copy-id >/dev/null 2>&1; then
        missing_tools+=("ssh-copy-id")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_warning "缺少工具: ${missing_tools[*]}"
        log_info "在Ubuntu/Debian上安装: sudo apt install openssh-client"
        log_info "在CentOS/RHEL上安装: sudo yum install openssh-clients"
    fi
}

# 生成SSH密钥
generate_ssh_key() {
    local email="${1:-your_email@example.com}"
    local key_type="${2:-rsa}"
    local key_bits="${3:-4096}"
    
    local key_path="$HOME/.ssh/id_$key_type"
    
    if [ -f "$key_path" ]; then
        log_warning "SSH密钥已存在: $key_path"
        read -p "是否覆盖现有密钥? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "保留现有密钥"
            return
        fi
    fi
    
    log_info "生成SSH密钥对..."
    ssh-keygen -t "$key_type" -b "$key_bits" -C "$email" -f "$key_path" -N ""
    
    log_success "SSH密钥生成完成: $key_path"
}

# 显示公钥内容
show_public_key() {
    local key_type="${1:-rsa}"
    local pub_key_path="$HOME/.ssh/id_$key_type.pub"
    
    if [ ! -f "$pub_key_path" ]; then
        log_error "公钥文件不存在: $pub_key_path"
        log_info "请先生成SSH密钥"
        return 1
    fi
    
    echo
    echo "=== SSH公钥内容 ==="
    cat "$pub_key_path"
    echo "==================="
    echo
    log_info "请将上面的公钥内容添加到服务器的 ~/.ssh/authorized_keys 文件中"
}

# 复制公钥到服务器
copy_public_key() {
    local server_user="$1"
    local server_ip="$2"
    
    if [ -z "$server_user" ] || [ -z "$server_ip" ]; then
        log_error "请提供服务器用户名和IP地址"
        echo "用法: $0 copy-key username server_ip"
        return 1
    fi
    
    log_info "复制公钥到服务器 $server_user@$server_ip..."
    
    if command -v ssh-copy-id >/dev/null 2>&1; then
        ssh-copy-id "$server_user@$server_ip"
    else
        log_info "ssh-copy-id不可用，手动复制公钥..."
        
        # 手动复制公钥
        local pub_key=$(cat "$HOME/.ssh/id_rsa.pub")
        
        ssh "$server_user@$server_ip" "
            mkdir -p ~/.ssh &&
            chmod 700 ~/.ssh &&
            echo '$pub_key' >> ~/.ssh/authorized_keys &&
            chmod 600 ~/.ssh/authorized_keys
        "
    fi
    
    log_success "公钥已复制到服务器"
}

# 测试SSH连接
test_ssh_connection() {
    local server_user="$1"
    local server_ip="$2"
    
    if [ -z "$server_user" ] || [ -z "$server_ip" ]; then
        log_error "请提供服务器用户名和IP地址"
        return 1
    fi
    
    log_info "测试SSH连接到 $server_user@$server_ip..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$server_user@$server_ip" "echo 'SSH连接成功'"; then
        log_success "SSH密钥认证配置成功!"
    else
        log_error "SSH连接失败"
        log_info "请检查以下内容:"
        log_info "1. 服务器SSH服务是否运行"
        log_info "2. 防火墙是否允许SSH连接"
        log_info "3. 公钥是否正确添加到服务器的authorized_keys文件"
        log_info "4. 服务器authorized_keys文件权限是否正确(600)"
        return 1
    fi
}

# 设置SSH配置
setup_ssh_config() {
    local server_user="$1"
    local server_ip="$2"
    local config_name="${3:-gamden-server}"
    
    if [ -z "$server_user" ] || [ -z "$server_ip" ]; then
        log_error "请提供服务器用户名和IP地址"
        return 1
    fi
    
    local ssh_config="$HOME/.ssh/config"
    
    # 备份现有配置
    if [ -f "$ssh_config" ]; then
        cp "$ssh_config" "${ssh_config}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 添加配置
    cat >> "$ssh_config" << EOF

# GamDen项目服务器配置
Host $config_name
    HostName $server_ip
    User $server_user
    Port 22
    IdentityFile ~/.ssh/id_rsa
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

EOF

    chmod 600 "$ssh_config"
    
    log_success "SSH配置已添加"
    log_info "现在可以使用以下命令连接服务器:"
    log_info "ssh $config_name"
}

# 显示使用帮助
show_help() {
    cat << EOF
SSH密钥设置助手

使用方法:
    $0 [命令] [选项]

命令:
    generate [email] [type] [bits]    生成SSH密钥对
                                      email: 邮箱地址 (默认: your_email@example.com)
                                      type: 密钥类型 (默认: rsa)
                                      bits: 密钥长度 (默认: 4096)
    
    show [type]                      显示公钥内容
                                      type: 密钥类型 (默认: rsa)
    
    copy-key user ip                 复制公钥到服务器
    
    test user ip                     测试SSH连接
    
    setup-config user ip [name]      设置SSH配置别名
    
    all user ip [name]              执行完整设置流程
    
    help                             显示此帮助信息

示例:
    $0 generate john@example.com ed25519 256
    $0 copy-key root 192.168.1.100
    $0 test root 192.168.1.100
    $0 all root 43.160.220.131 gamden

EOF
}

# 主函数
main() {
    local command="${1:-help}"
    
    case "$command" in
        "generate")
            check_prerequisites
            generate_ssh_key "$2" "$3" "$4"
            ;;
        "show")
            show_public_key "$2"
            ;;
        "copy-key")
            copy_public_key "$2" "$3"
            ;;
        "test")
            test_ssh_connection "$2" "$3"
            ;;
        "setup-config")
            setup_ssh_config "$2" "$3" "$4"
            ;;
        "all")
            local server_user="$2"
            local server_ip="$3"
            local config_name="${4:-gamden-server}"
            
            check_prerequisites
            generate_ssh_key
            show_public_key
            copy_public_key "$server_user" "$server_ip"
            test_ssh_connection "$server_user" "$server_ip"
            setup_ssh_config "$server_user" "$server_ip" "$config_name"
            
            log_success "SSH密钥配置完成!"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
main "$@"