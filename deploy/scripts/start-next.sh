#!/bin/bash
cd /root/GamDen_20260623052501/marketing-site
mkdir -p /var/log
nohup ./node_modules/.bin/next start -p 3002 > /var/log/gamden-marketing.log 2>&1 &
disown
echo "Started next with PID $!"
sleep 5
ps -ef | grep -E 'next|node' | grep -v grep
echo '---PORT---'
ss -tlnp 2>/dev/null | grep 3002 || echo "no 3002"
echo '---LOG---'
cat /var/log/gamden-marketing.log 2>&1 | tail -20