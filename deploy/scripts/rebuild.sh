#!/bin/bash
echo '=== Step 1: install dev deps ==='
cd /root/GamDen_20260623052501/marketing-site
npm install --include=dev --no-audit --no-fund --loglevel=error 2>&1 | tail -5
echo '=== Step 2: clean old .next ==='
rm -rf .next
echo '=== Step 3: build ==='
npm run build 2>&1 | tail -30
echo '=== Step 4: verify BUILD_ID ==='
test -f .next/BUILD_ID && echo "BUILD_ID: $(cat .next/BUILD_ID)" || echo "BUILD_ID MISSING"
echo '=== DONE ==='