#!/bin/bash
# =============================================================================
# GamDen 增量重部署脚本（服务器端）
# -----------------------------------------------------------------------------
# 用途：在已部署好的服务器上，快速让代码/配置改动生效
#       配合本地的 redeploy-prod.ps1 使用
#
# 流程：
#   1) 校验 nginx.conf 语法
#   2) 重新加载 nginx（不中断服务）
#   3) 重启 backend（让 .env 改动生效）
#   4) 可选：重建 frontend 镜像（让 .env.production 改动生效）
#   5) 容器健康检查
#   6) 端到端 HTTP 探测
# =============================================================================

set -e

# ---- 颜色与日志 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[ OK ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }

# ---- 默认配置（可被环境变量/参数覆盖）----
PROJECT_DIR="${PROJECT_DIR:-/opt/gamden}"
DOMAIN="${DOMAIN:-gamden.matux.tech}"
REBUILD_FRONTEND="${REBUILD_FRONTEND:-false}"
SKIP_NGINX="${SKIP_NGINX:-false}"
SKIP_BACKEND="${SKIP_BACKEND:-false}"
SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-false}"

# ---- 解析参数 ----
usage() {
    cat <<EOF
用法: $0 [选项]

选项:
    --project-dir <path>   项目目录 (默认: /opt/gamden)
    --domain <domain>      生产域名 (默认: gamden.matux.tech)
    --rebuild-frontend     重建 frontend 镜像（改 frontend/.env.production / 改前端代码时必加）
    --skip-nginx           跳过 nginx reload
    --skip-backend         跳过 backend 重启
    --skip-healthcheck     跳过端到端健康检查
    -h, --help             显示本帮助

示例:
    # 仅重新加载 nginx（只改 nginx.conf 时）
    $0 --skip-backend

    # 改了 frontend/.env.production / 前端代码
    $0 --rebuild-frontend

    # 完整流程
    $0 --rebuild-frontend
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --project-dir)      PROJECT_DIR="$2"; shift 2 ;;
        --domain)           DOMAIN="$2"; shift 2 ;;
        --rebuild-frontend) REBUILD_FRONTEND=true; shift ;;
        --skip-nginx)       SKIP_NGINX=true; shift ;;
        --skip-backend)     SKIP_BACKEND=true; shift ;;
        --skip-healthcheck) SKIP_HEALTHCHECK=true; shift ;;
        -h|--help)          usage; exit 0 ;;
        *)                  log_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

# ---- 前置检查 ----
preflight() {
    log_info "===== 前置检查 ====="

    if [[ ! -d "$PROJECT_DIR" ]]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi

    if ! command -v docker &>/dev/null; then
        log_error "docker 未安装"
        exit 1
    fi

    if ! docker ps &>/dev/null; then
        log_error "无法连接 docker daemon（用户需加入 docker 组或使用 sudo）"
        exit 1
    fi

    cd "$PROJECT_DIR"
    log_ok "项目目录: $PROJECT_DIR"
    log_ok "Docker 可用"

    # 检查核心容器
    for c in gamden-nginx gamden-backend gamden-frontend; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
            log_warn "容器未运行: $c（首次部署？跑 docker compose up -d）"
        else
            log_ok "容器运行中: $c"
        fi
    done
}

# ---- Step 1: nginx 配置校验 + reload ----
reload_nginx() {
    if [[ "$SKIP_NGINX" == "true" ]]; then
        log_warn "跳过 nginx reload（--skip-nginx）"
        return 0
    fi

    log_info "===== Step 1/4: 校验并重载 nginx ====="

    if ! docker exec gamden-nginx nginx -t; then
        log_error "nginx 配置语法错误！请检查 nginx.conf"
        exit 1
    fi

    docker exec gamden-nginx nginx -s reload
    log_ok "nginx reload 成功"
}

# ---- Step 2: 重启 backend ----
restart_backend() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        log_warn "跳过 backend 重启（--skip-backend）"
        return 0
    fi

    log_info "===== Step 2/4: 重启 backend（让 .env 改动生效）====="

    if docker ps --format '{{.Names}}' | grep -q "^gamden-backend$"; then
        cd "$PROJECT_DIR"
        docker compose --env-file .env restart gamden-backend
        log_ok "backend 已重启"
    else
        log_warn "backend 容器未运行，跳过"
        return 0
    fi

    # 等待后端就绪
    log_info "等待 backend 健康检查通过..."
    local i=0
    while [[ $i -lt 30 ]]; do
        if docker exec gamden-nginx sh -c "wget -qO- http://gamden-backend:3000/health 2>/dev/null" | grep -q '"status":"ok"'; then
            log_ok "backend 健康检查通过（${i}s）"
            return 0
        fi
        sleep 1
        i=$((i+1))
    done
    log_error "backend 30s 内未就绪，请查看日志: docker logs gamden-backend"
    exit 1
}

# ---- Step 3: 重建 frontend ----
rebuild_frontend() {
    if [[ "$REBUILD_FRONTEND" != "true" ]]; then
        log_warn "跳过 frontend 重建（仅当改了 frontend/.env.production 或前端代码时才需要）"
        return 0
    fi

    log_info "===== Step 3/4: 重建 frontend（耗时 2-5 分钟）====="

    cd "$PROJECT_DIR"
    docker compose --env-file .env up -d --build gamden-frontend
    log_ok "frontend 已重新构建并启动"

    # 等待前端就绪
    log_info "等待 frontend 就绪..."
    local i=0
    while [[ $i -lt 60 ]]; do
        if docker exec gamden-nginx sh -c "wget -qO- http://gamden-frontend:3000/ 2>/dev/null" | grep -qi "GamDen\|巢穴\|领地"; then
            log_ok "frontend 就绪（${i}s）"
            return 0
        fi
        sleep 2
        i=$((i+1))
    done
    log_error "frontend 120s 内未就绪，请查看日志: docker logs gamden-frontend"
    exit 1
}

# ---- Step 4: 端到端健康检查 ----
health_check() {
    if [[ "$SKIP_HEALTHCHECK" == "true" ]]; then
        log_warn "跳过端到端健康检查（--skip-healthcheck）"
        return 0
    fi

    log_info "===== Step 4/4: 端到端健康检查 ====="
    local failed=0

    check() {
        local desc="$1"
        local url="$2"
        local expect="$3"
        local body
        body=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
        if echo "$body" | grep -q "$expect" 2>/dev/null || [[ "$body" == "$expect" ]]; then
            log_ok "$desc → $url"
        else
            log_error "$desc → $url (HTTP $body, 期望匹配: $expect)"
            failed=$((failed+1))
        fi
    }

    check "主站首页"        "http://${DOMAIN}/"                       "200"
    check "后端 /health"     "http://${DOMAIN}/health"                 "status"
    check "SMS 接口(路由)"   "http://${DOMAIN}/api/auth/sms/send"      "404"
    check "领地接口(路由)"   "http://${DOMAIN}/api/territory/info"     "404"
    check "营销站(若 DNS)"   "http://marketing.${DOMAIN#gamden.}/"     "200"

    if [[ $failed -gt 0 ]]; then
        log_warn "$failed 项检查未通过，请人工复核"
        return 1
    fi

    log_ok "全部健康检查通过 🎉"
}

# ---- 主流程 ----
main() {
    echo "============================================"
    echo "  GamDen 增量重部署"
    echo "  项目目录: $PROJECT_DIR"
    echo "  域名:     $DOMAIN"
    echo "  重建前端: $REBUILD_FRONTEND"
    echo "============================================"
    echo

    preflight
    reload_nginx
    restart_backend
    rebuild_frontend
    health_check

    echo
    echo "============================================"
    log_ok "部署完成 🚀"
    echo "  访问: http://${DOMAIN}"
    echo "============================================"
}

main "$@"
