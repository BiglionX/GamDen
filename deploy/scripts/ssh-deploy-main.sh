# SSH部署脚本主函数和部署流程

# 主部署流程
main() {
    echo "======================================"
    echo "    GamDen项目SSH一键部署脚本"
    echo "======================================"
    echo "服务器: $SERVER_USER@$SERVER_IP"
    echo "项目目录: $PROJECT_DIR"
    echo "后端端口: $BACKEND_PORT"
    echo "前端端口: $FRONTEND_PORT"
    echo "营销网站端口: $MARKETING_PORT"
    echo "生产模式: $PRODUCTION"
    echo "预览模式: $DRY_RUN"
    echo "======================================"
    echo
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # 确认部署
        echo "即将开始部署，这将会："
        echo "  1. 测试SSH连接"
        echo "  2. 创建项目目录结构"
        [[ "$SKIP_BACKEND" == "false" ]] && echo "  3. 部署后端服务"
        [[ "$SKIP_FRONTEND" == "false" ]] && echo "  4. 部署前端应用"
        [[ "$SKIP_MARKETING" == "false" ]] && echo "  5. 部署营销网站"
        [[ "$SKIP_DATABASE" == "false" ]] && echo "  6. 设置数据库"
        echo "  7. 配置环境变量"
        echo "  8. 构建项目"
        echo "  9. 配置并启动服务"
        echo
        
        read -p "确认继续部署？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    # 执行部署步骤
    test_ssh_connection
    create_project_structure
    
    # 部署后端
    if [[ "$SKIP_BACKEND" == "false" ]]; then
        log_info "开始部署后端服务"
        pack_and_transfer "backend" "d:/GamDen/backend" "backend"
        install_dependencies "backend" "backend"
        build_project "backend" "backend" "npm run build"
    fi
    
    # 部署前端
    if [[ "$SKIP_FRONTEND" == "false" ]]; then
        log_info "开始部署前端应用"
        pack_and_transfer "frontend" "d:/GamDen/frontend" "frontend"
        install_dependencies "frontend" "frontend"
        build_project "frontend" "frontend" "npm run build"
    fi
    
    # 部署营销网站
    if [[ "$SKIP_MARKETING" == "false" ]]; then
        log_info "开始部署营销网站"
        pack_and_transfer "marketing-site" "d:/GamDen/marketing-site" "marketing-site"
        install_dependencies "marketing-site" "marketing-site"
        build_project "marketing-site" "marketing-site" "npm run build"
    fi
    
    # 设置数据库
    setup_database
    
    # 配置环境变量
    setup_environment
    
    # 启动服务
    start_services
    
    # 部署完成
    echo
    echo "======================================"
    log_success "GamDen项目部署完成！"
    echo "======================================"
    echo "访问地址:"
    echo "  前端应用: http://$SERVER_IP:$FRONTEND_PORT"
    echo "  营销网站: http://$SERVER_IP:$MARKETING_PORT"
    echo "  后端API: http://$SERVER_IP:$BACKEND_PORT/api/v1"
    echo "  API文档: http://$SERVER_IP:$BACKEND_PORT/api/docs"
    echo
    echo "管理命令:"
    echo "  查看服务状态: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl status gamden-*'"
    echo "  重启所有服务: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart gamden-*'"
    echo "  查看日志: ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u gamden-* -f'"
    echo "======================================"
}

# 合并所有脚本并执行
SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"
source \"$SCRIPT_DIR/ssh-deploy.sh\"
source \"$SCRIPT_DIR/ssh-deploy-core.sh\"
source \"$SCRIPT_DIR/ssh-deploy-build.sh\"

# 执行主函数
main "$@"