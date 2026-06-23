#!/bin/bash
echo '=== Step 1: kill existing next-server ==='
pkill -f 'next-server' 2>&1 || true
pkill -f 'next start' 2>&1 || true
sleep 2
ss -tlnp 2>/dev/null | grep 3002 && echo "port still in use!" || echo "port 3002 freed"

echo '=== Step 2: start with PM2 ==='
cd /root/GamDen_20260623052501/marketing-site
pm2 start ./node_modules/.bin/next --name gamden-marketing -- start -p 3002 2>&1 | tail -5

echo '=== Step 3: save PM2 config ==='
pm2 save 2>&1 | tail -2

echo '=== Step 4: wait 6s for next-server to bind 3002 ==='
sleep 6

echo '=== Step 5: PM2 status ==='
pm2 list

echo '=== Step 6: port check ==='
ss -tlnp 2>/dev/null | grep 3002

echo '=== Step 7: health check ==='
curl -sS -o /dev/null -w 'grid.svg: %{http_code} size=%{size_download}\n' http://localhost:3002/images/grid.svg
curl -sS -o /dev/null -w 'homepage: %{http_code} size=%{size_download}\n' http://localhost:3002/

echo '=== DONE ==='