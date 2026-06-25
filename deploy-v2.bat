@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\deploy-result.txt

echo === A: git pull === > %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && git pull origin master 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === B: git log === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && git log --oneline -3 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === C: copy .env.example to .env (idempotent) === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && (test -f .env || cp .env.example .env); ls -la .env 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === D: stop old backend container (if running) === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose down gamden-backend 2>&1; docker rm -f gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === E: docker compose up postgres === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d --no-deps gamden-postgres 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === F: docker compose build gamden-backend (this takes time) === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && timeout 480 docker compose build gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === G: docker compose up gamden-backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === H: wait 30s and check status === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 30 && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === I: backend container logs (last 60) === >> %OUT%
ssh %SSHOPTS% %HOST% "docker logs --tail 60 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === J: health check (curl localhost:3000) === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w 'HTTP=%{http_code}\n' http://localhost:3000/api/v1/docs 2>&1; curl -s -o /dev/null -w 'HEALTH=%{http_code}\n' http://localhost:3000/api/v1 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === DONE === >> %OUT%
type %OUT%
