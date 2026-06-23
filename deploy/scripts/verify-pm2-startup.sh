#!/bin/bash
echo '=== systemd service status ==='
systemctl status pm2-root --no-pager 2>&1 | head -20

echo '=== pm2-root.service content ==='
cat /etc/systemd/system/pm2-root.service

echo '=== is enabled? ==='
systemctl is-enabled pm2-root

echo '=== current pm2 processes (to be auto-restored) ==='
pm2 list
echo '---'
cat /root/.pm2/dump.pm2 | head -15

echo '=== test: systemctl start pm2-root (should not interrupt) ==='
systemctl start pm2-root 2>&1
sleep 2
pm2 list

echo '=== DONE ==='