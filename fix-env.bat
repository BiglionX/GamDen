@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\fix-env-result.txt

echo === Remove old .env on server === > %OUT%
ssh %SSHOPTS% %HOST% "rm -f /opt/GamDen/.env && echo removed" >> %OUT% 2>&1
echo. >> %OUT%
echo === SCP upload new .env === >> %OUT%
scp %SSHOPTS% d:\GamDen\.env %HOST%:/opt/GamDen/.env >> %OUT% 2>&1
echo. >> %OUT%
echo === Verify .env on server === >> %OUT%
ssh %SSHOPTS% %HOST% "wc -l /opt/GamDen/.env && echo --- && head -28 /opt/GamDen/.env && echo --- && echo duplicate check: && grep -nE '^(DB_HOST|DB_PORT|REDIS_HOST)=' /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Restart backend container === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1 || true; docker rm -f gamden-backend 2>&1 || true; docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 30s and check logs === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 30 && docker logs --tail 100 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format table" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%