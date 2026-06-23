#!/bin/bash
echo '=== PM2 ==='
pm2 list
echo '=== NEXT PROC ==='
ps -ef | grep -E 'next|node' | grep -v grep
echo '=== PORT 3002 ==='
ss -tlnp 2>/dev/null | grep 3002 || echo "no 3002"
echo '=== LOG ==='
tail -30 /var/log/gamden-marketing.log 2>&1
echo '=== PM2 ERR ==='
tail -10 /root/.pm2/logs/gamden-marketing-error.log 2>&1
echo '=== DONE ==='