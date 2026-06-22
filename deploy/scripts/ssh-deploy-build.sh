# SSH部署脚本构建和服务管理函数

# 构建项目函数
build_project() {
    local component=$1
    local component_dir=$2
    local build_cmd=$3
    
    log_info "构建 $component 项目"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        ssh "$SERVER_USER@$SERVER_IP" "
            cd $PROJECT_DIR/$component_dir &&
            $build_cmd
        "
        log_success "$component 项目构建完成"
    else
        log_info "[DRY RUN] 将构建 $component 项目"
    fi
}

# 启动服务函数
start_services() {
    log_info "启动所有服务"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # 创建systemd服务文件
        ssh "$SERVER_USER@$SERVER_IP" "
            # 检查是否为root用户或有sudo权限
            if [ \"\$EUID\" -ne 0 ] && ! command -v sudo &> /dev/null; then
                log_warning '无sudo权限，将跳过服务配置，需手动启动服务'
                return 0
            fi
            
            SUDO_CMD=''
            if [ \"\$EUID\" -ne 0 ]; then
                SUDO_CMD='sudo'
            fi
            
            # 后端服务
            \$SUDO_CMD tee /etc/systemd/system/gamden-backend.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=GamDen Backend Service
After=network.target postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=NODE_ENV=production
EnvironmentFile=$PROJECT_DIR/backend/.env.production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/backend/out.log
StandardError=append:$PROJECT_DIR/logs/backend/error.log
SyslogIdentifier=gamden-backend
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
SERVICEEOF
            
            # 前端服务
            \$SUDO_CMD tee /etc/systemd/system/gamden-frontend.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=GamDen Frontend Service
After=network.target nginx.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/frontend/build
Environment=PORT=$FRONTEND_PORT
ExecStart=/usr/bin/npx serve -s . -l $FRONTEND_PORT
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/frontend/out.log
StandardError=append:$PROJECT_DIR/logs/frontend/error.log
SyslogIdentifier=gamden-frontend
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
SERVICEEOF
            
            # 营销网站服务
            \$SUDO_CMD tee /etc/systemd/system/gamden-marketing.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=GamDen Marketing Site Service
After=network.target nginx.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/marketing-site
Environment=PORT=$MARKETING_PORT
EnvironmentFile=$PROJECT_DIR/marketing-site/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/marketing/out.log
StandardError=append:$PROJECT_DIR/logs/marketing/error.log
SyslogIdentifier=gamden-marketing
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
SERVICEEOF
            
            # 重新加载systemd配置
            \$SUDO_CMD systemctl daemon-reload
            
            # 创建www-data用户和组（如果不存在）
            if ! id www-data &> /dev/null; then
                \$SUDO_CMD groupadd www-data
                \$SUDO_CMD useradd -g www-data -s /bin/false www-data
            fi
            
            # 设置目录权限
            \$SUDO_CMD chown -R www-data:www-data $PROJECT_DIR
            \$SUDO_CMD chmod -R 755 $PROJECT_DIR
            
            # 启用服务（但不立即启动）
            \$SUDO_CMD systemctl enable gamden-backend gamden-frontend gamden-marketing
            
            echo '服务配置完成'
        "
        
        log_success "服务配置完成"
        
        # 询问是否立即启动服务
        echo
        echo "服务已配置完成！"
        echo "访问地址:"
        echo "  前端应用: http://$SERVER_IP:$FRONTEND_PORT"
        echo "  营销网站: http://$SERVER_IP:$MARKETING_PORT"
        echo "  后端API: http://$SERVER_IP:$BACKEND_PORT/api/v1"
        echo
        read -p "是否立即启动所有服务？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ssh "$SERVER_USER@$SERVER_IP" "
                \$SUDO_CMD systemctl start gamden-backend gamden-frontend gamden-marketing
                sleep 5
                echo '服务状态:'
                \$SUDO_CMD systemctl status gamden-backend gamden-frontend gamden-marketing --no-pager -l
            "
            log_success "所有服务已启动"
        else
            log_info "服务已配置但未启动，可稍后手动启动:"
            log_info "sudo systemctl start gamden-backend gamden-frontend gamden-marketing"
            log_info "查看服务状态: sudo systemctl status gamden-*"
            log_info "停止服务: sudo systemctl stop gamden-*"
        fi
    else
        log_info "[DRY RUN] 将配置和启动服务"
    fi
}

# 数据库设置函数
setup_database() {
    if [[ "$SKIP_DATABASE" == "true" ]]; then
        log_info "跳过数据库设置"
        return
    fi
    
    log_info "设置数据库"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # 这里可以添加数据库初始化脚本
        log_warning "请确保数据库已正确配置，参考 DATABASE_SETUP_NEON.md"
        log_info "如需自动数据库设置，请修改此脚本或使用数据库迁移工具"
        
        # 示例数据库检查命令（可选）
        ssh "$SERVER_USER@$SERVER_IP" "
            if command -v psql &> /dev/null; then
                echo 'PostgreSQL已安装'
                # 这里可以添加数据库创建和初始化逻辑
                # 注意：实际密码应该从安全的密钥管理系统中获取
            else
                echo 'PostgreSQL未安装，请先安装PostgreSQL'
            fi
        "
    else
        log_info "[DRY RUN] 将设置数据库"
    fi
}