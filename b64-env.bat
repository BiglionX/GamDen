@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\b64-env-result.txt

echo === Upload .env.b64 === > %OUT%
scp %SSHOPTS% d:\GamDen\.env.b64 %HOST%:/tmp/.env.b64 >> %OUT% 2>&1
echo. >> %OUT%
echo === Decode and overwrite .env on server === >> %OUT%
ssh %SSHOPTS% %HOST% "base64 -d /tmp/.env.b64 > /opt/GamDen/.env && wc -l /opt/GamDen/.env && rm /tmp/.env.b64" >> %OUT% 2>&1
echo. >> %OUT%
echo === Verify .env (no duplicates) === >> %OUT%
ssh %SSHOPTS% %HOST% "echo '--- DB_HOST lines:' && grep -nE '^DB_HOST=' /opt/GamDen/.env && echo '--- DB_PORT lines:' && grep -nE '^DB_PORT=' /opt/GamDen/.env && echo '--- REDIS_HOST lines:' && grep -nE '^REDIS_HOST=' /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Restart backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1 || true; docker rm -f gamden-backend 2>&1 || true; docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 35s + show logs === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 35 && docker logs --tail 80 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format table" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%