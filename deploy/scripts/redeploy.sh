#!/bin/bash
# =============================================================================
# GamDen 一键重部署脚本（服务器端）
# 其他 IDE 只需 SSH 执行这一条命令即可完成部署
# =============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
log_ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
log_info() { echo -e "${BLUE}[→]${NC} $1"; }
log_err()  { echo -e "${RED}[✗]${NC} $1"; }

PROJECT_DIR="${PROJECT_DIR:-/opt/GamDen}"
REBUILD_MARKETING="${REBUILD_MARKETING:-true}"
SKIP_PULL="${SKIP_PULL:-false}"

echo "============================================"
echo "  GamDen 一键部署"
echo "  项目目录: $PROJECT_DIR"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

cd "$PROJECT_DIR" || { log_err "项目目录不存在"; exit 1; }

# ---- Step 1: 拉取最新代码 ----
if [ "$SKIP_PULL" != "true" ]; then
    log_info "拉取最新代码..."
    git pull origin master
    log_ok "代码已更新"
else
    log_info "跳过 git pull (SKIP_PULL=true)"
fi

# ---- Step 2: 构建营销网站 ----
if [ "$REBUILD_MARKETING" = "true" ]; then
    log_info "构建营销网站..."
    cd "$PROJECT_DIR/marketing-site"
    npm install --silent 2>&1 | tail -1
    npm run build 2>&1
    log_ok "营销网站构建完成"
    cd "$PROJECT_DIR"
fi

# ---- Step 3: 重启 PM2 进程 ----
log_info "重启 gamden-marketing 进程..."
if command -v pm2 &>/dev/null; then
    pm2 restart gamden-marketing 2>&1
    log_ok "PM2 进程已重启"
else
    log_err "PM2 未安装"
    exit 1
fi

# ---- Step 4: 验证 Nginx ----
log_info "检查 Nginx 容器..."
if docker ps --format '{{.Names}}' | grep -q "^gamden-nginx$"; then
    log_ok "Nginx 容器运行中"
else
    log_err "Nginx 容器未运行，尝试启动..."
    docker start gamden-nginx 2>/dev/null || true
fi

# ---- Step 5: 健康检查 ----
log_info "健康检查..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "网站访问正常 (HTTP $HTTP_CODE)"
else
    log_err "网站返回 HTTP $HTTP_CODE，请检查日志"
    pm2 logs gamden-marketing --lines 10
    exit 1
fi

echo ""
echo "============================================"
log_ok "🎉 部署完成！"
echo "  访问: http://43.160.220.131"
echo "============================================"
