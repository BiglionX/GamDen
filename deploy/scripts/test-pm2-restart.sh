#!/bin/bash
echo '=== Pre-restart health ==='
curl -sS -o /dev/null -w 'homepage: %{http_code} time=%{time_total}s\n' http://localhost:3002/
curl -sS -o /dev/null -w 'grid.svg: %{http_code}\n' http://localhost:3002/images/grid.svg

echo '=== Test: pm2 restart gamden-marketing ==='
pm2 restart gamden-marketing 2>&1 | tail -5
sleep 4

echo '=== Post-restart health ==='
pm2 list | head -20
echo '---'
curl -sS -o /dev/null -w 'homepage: %{http_code} time=%{time_total}s\n' http://localhost:3002/
curl -sS -o /dev/null -w 'grid.svg: %{http_code}\n' http://localhost:3002/images/grid.svg
curl -sS -o /dev/null -w 'product: %{http_code}\n' http://localhost:3002/product

echo '=== Verify PM2 config saved ==='
cat /root/.pm2/dump.pm2 | head -3
echo '---'
pm2 list

echo '=== DONE ==='