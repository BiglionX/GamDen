@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\force-env-result.txt

echo === Re-upload .env.b64 === > %OUT%
scp %SSHOPTS% d:\GamDen\.env.b64 %HOST%:/tmp/.env.b64 >> %OUT% 2>&1
echo scp-exit=%ERRORLEVEL% >> %OUT%
echo. >> %OUT%
echo === Decode using bash -c to avoid PowerShell redirection === >> %OUT%
ssh %SSHOPTS% %HOST% "bash -c 'rm -f /opt/GamDen/.env && base64 -d /tmp/.env.b64 > /opt/GamDen/.env && wc -l /opt/GamDen/.env && wc -c /opt/GamDen/.env && rm /tmp/.env.b64'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Verify .env === >> %OUT%
ssh %SSHOPTS% %HOST% "echo DB_HOST lines:; grep -nE '^DB_HOST=' /opt/GamDen/.env; echo DB_PORT lines:; grep -nE '^DB_PORT=' /opt/GamDen/.env; echo REDIS_HOST lines:; grep -nE '^REDIS_HOST=' /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Last 10 lines of .env === >> %OUT%
ssh %SSHOPTS% %HOST% "tail -10 /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Restart backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1; docker rm -f gamden-backend 2>&1; docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 30s and logs === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 30 && docker logs --tail 50 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format table" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%