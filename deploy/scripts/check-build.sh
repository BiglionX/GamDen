#!/bin/bash
echo '=== .next contents ==='
ls -la /root/GamDen_20260623052501/marketing-site/.next/ 2>&1
echo '=== BUILD_ID check ==='
test -f /root/GamDen_20260623052501/marketing-site/.next/BUILD_ID && echo "BUILD_ID exists: $(cat /root/GamDen_20260623052501/marketing-site/.next/BUILD_ID)" || echo "BUILD_ID MISSING"
echo '=== Required files ==='
for f in BUILD_ID required-server-files.json app-build-manifest.json; do
  if [ -f "/root/GamDen_20260623052501/marketing-site/.next/$f" ]; then
    echo "OK: $f"
  else
    echo "MISSING: $f"
  fi
done