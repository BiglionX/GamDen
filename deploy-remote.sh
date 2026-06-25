#!/bin/bash
# ============================================
# GamDen 一键部署脚本 (选项2: 当前目录结构)
# 服务器：43.160.220.131 (Ubuntu 22.04)
# 端口：marketing:3002  admin:3001  backend:3000
# ============================================

set -e

SERVER="root@43.160.220.131"
LOCAL_DIR="d:/GamDen"

# 服务端口
MARKETING_PORT=3002
ADMIN_PORT=3001
BACKEND_PORT=3000

# 域名
DOMAIN="gamden.matux.tech"

echo "=========================================="
echo "  GamDen 完整部署脚本（选项2）"
echo "=========================================="
echo ""

# --------------------------------------------
# Step 1: 安装 Nginx
# --------------------------------------------
echo "[1/6] 安装 Nginx..."
ssh $SERVER "apt-get update -qq && apt-get install -y -qq nginx"

# --------------------------------------------
# Step 2: 同步代码
# --------------------------------------------
echo "[2/6] 同步代码..."

# 营销网站（根目录的 app/, components/, lib/, public/, package.json 等）
ssh $SERVER "mkdir -p /root/marketing-site"
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  --exclude='backend' --exclude='frontend' --exclude='gamden-app' \
  --exclude='marketing-site' --exclude='docs' --exclude='scripts' \
  --exclude='nginx' --exclude='deploy' \
  --exclude='.env*' --exclude='*.log' --exclude='*.bat' --exclude='*.ps1' \
  --exclude='*.png' --exclude='*.txt' --exclude='*.md' \
  $LOCAL_DIR/ $SERVER:/root/marketing-site/

# Admin 前端
rsync -avz --exclude='node_modules' --exclude='.next' \
  $LOCAL_DIR/frontend/ $SERVER:/root/frontend/

# Backend
rsync -avz --exclude='node_modules' --exclude='dist' \
  $LOCAL_DIR/backend/ $SERVER:/root/backend/

# --------------------------------------------
# Step 3: 安装依赖并构建
# --------------------------------------------
echo "[3/6] 安装依赖并构建..."

# Marketing site
ssh $SERVER "cd /root/marketing-site && npm install --production && npm run build"

# Frontend (admin)
ssh $SERVER "cd /root/frontend && npm install --production && npm run build"

# Backend
ssh $SERVER "cd /root/backend && npm install --production"

# --------------------------------------------
# Step 4: 配置 PM2
# --------------------------------------------
echo "[4/6] 启动 PM2 进程..."

# 停止旧服务（保留 OpenIM 等其他服务）
ssh $SERVER "pm2 delete gamden-marketing gamden-admin gamden-backend 2>/dev/null || true"

# 启动 marketing-site
ssh $SERVER "cd /root/marketing-site && pm2 start ./node_modules/.bin/next --name gamden-marketing -- start -p $MARKETING_PORT"

# 启动 frontend (admin)
ssh $SERVER "cd /root/frontend && pm2 start ./node_modules/.bin/next --name gamden-admin -- start -p $ADMIN_PORT"

# 启动 backend
ssh $SERVER "cd /root/backend && pm2 start npm --name gamden-backend -- run start"

# 持久化
ssh $SERVER "pm2 save"

# --------------------------------------------
# Step 5: 配置 Nginx 反向代理
# --------------------------------------------
echo "[5/6] 配置 Nginx..."

ssh $SERVER "cat > /etc/nginx/sites-available/gamden << 'NGINX_EOF'
server {
    listen 80;
    server_name $DOMAIN *.$DOMAIN;

    # 营销网站
    location / {
        proxy_pass http://127.0.0.1:$MARKETING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Admin 后台
    location /admin {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF
"

ssh $SERVER "ln -sf /etc/nginx/sites-available/gamden /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx && systemctl enable nginx"

# --------------------------------------------
# Step 6: 验证
# --------------------------------------------
echo "[6/6] 验证部署..."
echo ""

ssh $SERVER "pm2 list"
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  营销网站:  http://$DOMAIN/"
echo "  Admin后台: http://$DOMAIN/admin"
echo "  API接口:   http://$DOMAIN/api/"
echo ""
echo "PM2 运维命令："
echo "  pm2 status           # 查看所有服务"
echo "  pm2 logs             # 查看日志"
echo "  pm2 restart gamden-marketing   # 重启营销站"
echo "  pm2 restart gamden-admin       # 重启 admin"
echo "  pm2 restart gamden-backend     # 重启后端"
echo ""
