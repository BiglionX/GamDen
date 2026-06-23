#!/bin/bash
set -e
cd /root/GamDen_20260623052501/marketing-site
echo '=== Clean .next ==='
rm -rf .next
echo '=== Build ==='
npm run build 2>&1 | tail -20
echo '=== Verify BUILD_ID ==='
test -f .next/BUILD_ID && echo "BUILD_ID: $(cat .next/BUILD_ID)" || (echo "BUILD_ID MISSING - build failed"; exit 1)
echo '=== Start next ==='
nohup ./node_modules/.bin/next start -p 3002 > /var/log/gamden-marketing.log 2>&1 &
disown
echo "Started next with PID $!"
sleep 8
echo '=== Process check ==='
ps -ef | grep -E 'next|node' | grep -v grep
echo '=== Port check ==='
ss -tlnp 2>/dev/null | grep 3002 || echo "no 3002"
echo '=== Health check ==='
curl -sS -o /dev/null -w 'grid.svg: %{http_code} size=%{size_download}\n' http://localhost:3002/images/grid.svg
curl -sS -o /dev/null -w 'homepage: %{http_code} size=%{size_download}\n' http://localhost:3002/
echo '=== DONE ==='