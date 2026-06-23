#!/bin/bash
echo "=== SSH OK ==="
uname -a
echo "=== PM2 LIST ==="
pm2 list 2>&1 | head -25
echo "=== FIND MARKETING DIR ==="
find / -type d -name "marketing-site" 2>/dev/null | head -5
echo "=== FIND GRID.SVG ==="
find / -name "grid.svg" 2>/dev/null | head -5
echo "=== CHECK PORT 3002 ==="
ss -tlnp 2>/dev/null | grep 3002 || netstat -tlnp 2>/dev/null | grep 3002
echo "=== DONE ==="