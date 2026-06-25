@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\heredoc-env-result.txt

echo === Check /tmp/.env.b64 exists === > %OUT%
ssh %SSHOPTS% %HOST% "ls -la /tmp/.env.b64 2>&1; echo --- size:; wc -c /tmp/.env.b64 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Use dd to force write base64 decoded content === >> %OUT%
ssh %SSHOPTS% %HOST% "rm -f /opt/GamDen/.env && touch /opt/GamDen/.env && base64 -d /tmp/.env.b64 >> /opt/GamDen/.env 2>&1 && wc -l /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Verify duplicate check after fresh write === >> %OUT%
ssh %SSHOPTS% %HOST% "echo DB_HOST lines:; grep -nE '^DB_HOST=' /opt/GamDen/.env; echo DB_PORT lines:; grep -nE '^DB_PORT=' /opt/GamDen/.env; echo REDIS_HOST lines:; grep -nE '^REDIS_HOST=' /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Restart backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1; docker rm -f gamden-backend 2>&1; docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 35s + logs === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 35 && docker logs --tail 50 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format table" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%