@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\deploy4-result.txt

echo === A: git pull === > %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && git pull origin master" >> %OUT% 2>&1
echo. >> %OUT%
echo === B: head commit === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && git log --oneline -2" >> %OUT% 2>&1
echo. >> %OUT%
echo === D: stop old backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1 || true; docker rm -f gamden-backend 2>&1 || true" >> %OUT% 2>&1
echo. >> %OUT%
echo === E: ensure postgres running === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d --no-deps gamden-postgres 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === F: docker compose build gamden-backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && timeout 480 docker compose build gamden-backend" >> %OUT% 2>&1
echo. >> %OUT%
echo === G: docker compose up gamden-backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d --no-deps gamden-backend" >> %OUT% 2>&1
echo. >> %OUT%
echo === H: wait 25s === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 25 && docker ps --format table" >> %OUT% 2>&1
echo. >> %OUT%
echo === I: backend logs (last 80) === >> %OUT%
ssh %SSHOPTS% %HOST% "docker logs --tail 80 gamden-backend" >> %OUT% 2>&1
echo. >> %OUT%
echo === J: health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo" >> %OUT% 2>&1
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo. >> %OUT%
echo === K: docs-json sample (first 600 chars) === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s http://localhost:3000/api/v1/docs-json 2>/dev/null | head -c 600; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%