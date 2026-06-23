#!/bin/bash
echo '=== Step 1: get startup command from pm2 ==='
STARTUP_CMD=$(pm2 startup 2>&1)
echo "$STARTUP_CMD"

# Extract the sudo env line from PM2 output
STARTUP_SCRIPT=$(echo "$STARTUP_CMD" | grep -oE 'sudo[^|]+pm2[^|]+' | head -1)
if [ -z "$STARTUP_SCRIPT" ]; then
  echo "Could not extract startup command"
  exit 1
fi
echo "=== Step 2: extracted script ==="
echo "$STARTUP_SCRIPT"

echo '=== Step 3: execute startup script ==='
# Use eval to handle the complex command
bash -c "$STARTUP_SCRIPT" 2>&1

echo '=== Step 4: enable and start systemd service ==='
SERVICE=$(echo "$STARTUP_CMD" | grep -oE 'systemctl enable [a-zA-Z0-9_-]+' | head -1)
if [ -n "$SERVICE" ]; then
  echo "Running: $SERVICE"
  $SERVICE 2>&1
fi

echo '=== Step 5: verify service ==='
systemctl list-unit-files 2>/dev/null | grep -i pm2
echo '---'
if [ -n "$SERVICE" ]; then
  SERVICENAME=$(echo "$SERVICE" | awk '{print $3}')
  systemctl status $SERVICENAME 2>&1 | head -10
fi

echo '=== Step 6: verify pm2 save is current ==='
pm2 list
echo '---'
cat /root/.pm2/dump.pm2 | head -10

echo '=== DONE ==='