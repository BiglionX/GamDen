# SSH部署脚本核心功能函数

# SSH连接测试函数
test_ssh_connection() {
    log_info "测试SSH连接到 $SERVER_USER@$SERVER_IP"
    if [[ "$DRY_RUN" == "false" ]]; then
        if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo 'SSH连接成功'"; then
            log_success "SSH连接测试通过"
        else
            log_error "SSH连接失败，请检查服务器信息和SSH密钥配置"
            exit 1
        fi
    else
        log_info "[DRY RUN] 将测试SSH连接"
    fi
}

# 创建项目目录结构函数
create_project_structure() {
    log_info "创建项目目录结构: $PROJECT_DIR"
    if [[ "$DRY_RUN" == "false" ]]; then
        ssh "$SERVER_USER@$SERVER_IP" "
            sudo mkdir -p $PROJECT_DIR/{backend,frontend,marketing-site,database,nginx,scripts,logs,ssl}
            sudo chown -R \$USER:\$USER $PROJECT_DIR
            mkdir -p $PROJECT_DIR/logs/{backend,frontend,marketing,nginx}
        "
        log_success "项目目录结构创建完成"
    else
        log_info "[DRY RUN] 将创建项目目录结构"
    fi
}

# 打包和传输文件函数
pack_and_transfer() {
    local component=$1
    local source_dir=$2
    local target_dir=$3
    
    log_info "打包并传输 $component 文件"
    
    # 创建临时打包目录
    local temp_dir="/tmp/gamden-deploy-$$"
    mkdir -p "$temp_dir"
    
    # 排除不必要的文件和目录
    local exclude_patterns=(
        "node_modules"
        ".git"
        ".next"
        "dist"
        "build"
        ".env.local"
        "*.log"
        ".DS_Store"
        "coverage"
        ".nyc_output"
    )
    
    local exclude_args=""
    for pattern in "${exclude_patterns[@]}"; do
        exclude_args="$exclude_args --exclude=$pattern"
    done
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # 打包文件
        tar -czf "$temp_dir/${component}.tar.gz" $exclude_args -C "$(dirname "$source_dir")" "$(basename "$source_dir")"
        
        # 传输到服务器
        scp "$temp_dir/${component}.tar.gz" "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/"
        
        # 在服务器上解压
        ssh "$SERVER_USER@$SERVER_IP" "
            cd $PROJECT_DIR &&
            tar -xzf ${component}.tar.gz &&
            rm ${component}.tar.gz
        "
        
        # 清理本地临时文件
        rm -rf "$temp_dir"
        
        log_success "$component 文件传输完成"
    else
        log_info "[DRY RUN] 将打包和传输 $component 文件"
    fi
}

# 安装依赖函数
install_dependencies() {
    local component=$1
    local component_dir=$2
    
    log_info "在服务器上安装 $component 依赖"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        ssh "$SERVER_USER@$SERVER_IP" "
            cd $PROJECT_DIR/$component_dir &&
            if [ -f 'package.json' ]; then
                # 检查Node.js和npm是否可用
                if command -v npm &> /dev/null; then
                    npm ci --only=production
                    if [ \"$PRODUCTION\" != \"true\" ]; then
                        npm install
                    fi
                else
                    log_warning 'npm未找到，跳过依赖安装' 
                fi
            fi
        "
        log_success "$component 依赖安装完成"
    else
        log_info "[DRY RUN] 将在服务器上安装 $component 依赖"
    fi
}

# 配置环境变量函数
setup_environment() {
    log_info "配置生产环境变量"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # 创建生产环境配置文件
        ssh "$SERVER_USER@$SERVER_IP" "
            # 创建配置目录
            sudo mkdir -p /etc/gamden
            
            # 后端环境变量
            cat > $PROJECT_DIR/backend/.env.production << 'ENVEOF'
NODE_ENV=production
PORT=$BACKEND_PORT
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamden_prod
DB_USER=gamden_user
DB_PASSWORD_FILE=/etc/gamden/db_password
JWT_SECRET_FILE=/etc/gamden/jwt_secret
CORS_ORIGIN=http://$SERVER_IP:$FRONTEND_PORT,http://$SERVER_IP:$MARKETING_PORT
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
ENVEOF
            
            # 前端环境变量
            cat > $PROJECT_DIR/frontend/.env.production << 'ENVEOF'
REACT_APP_API_URL=http://$SERVER_IP:$BACKEND_PORT/api/v1
REACT_APP_ENV=production
REACT_APP_VERSION=$(cat $PROJECT_DIR/version.txt 2>/dev/null || echo '1.0.0')
GENERATE_SOURCEMAP=false
BUILD_PATH=./build
ENVEOF
            
            # 营销网站环境变量
            cat > $PROJECT_DIR/marketing-site/.env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://$SERVER_IP:$BACKEND_PORT/api/v1
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_VERSION=$(cat $PROJECT_DIR/version.txt 2>/dev/null || echo '1.0.0')
ENVEOF
            
            # 创建版本文件
            echo '1.0.0' > $PROJECT_DIR/version.txt
        "
        log_success "环境变量配置完成"
    else
        log_info "[DRY RUN] 将配置生产环境变量"
    fi
}