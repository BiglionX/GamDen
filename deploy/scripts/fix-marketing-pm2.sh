#!/bin/bash
# 修复 PM2 配置并重启营销站

set -e

echo "=== Step 1: 停止 PM2 错误进程 ==="
pm2 delete gamden-marketing 2>&1 || echo "(delete skipped)"

echo "=== Step 2: 停止独立 next-server (PID 35098) ==="
pkill -f "next-server" 2>&1 || true
sleep 2
ss -tlnp 2>/dev/null | grep 3002 || echo "Port 3002 freed"

echo "=== Step 3: 用 PM2 正确启动营销站 ==="
cd /root/GamDen_20260623052501/marketing-site
pm2 start npm --name "gamden-marketing" --cwd /root/GamDen_20260623052501/marketing-site -- run start -- -p 3002 2>&1
pm2 save 2>&1

echo "=== Step 4: 验证服务 ==="
sleep 4
pm2 list
echo "---"
ss -tlnp 2>/dev/null | grep 3002
echo "---"
curl -sS -o /dev/null -w "LocalDirect: %{http_code} size=%{size_download}\n" http://localhost:3002/images/grid.svg
echo "---"
curl -sS -o /dev/null -w "Homepage: %{http_code} size=%{size_download}\n" http://localhost:3002/
echo "=== DONE ==="