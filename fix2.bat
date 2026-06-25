@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\fix2-result.txt

echo === Regenerate .env.b64 === > %OUT%
powershell -Command "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('d:\GamDen\.env'))" 1>nul 2>nul
powershell -Command "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('d:\GamDen\.env')) | Out-File 'd:\GamDen\.env.b64' -Encoding ASCII -NoNewline"
echo done local gen >> %OUT%
echo. >> %OUT%
echo === Upload .env.b64 === >> %OUT%
scp %SSHOPTS% d:\GamDen\.env.b64 %HOST%:/tmp/.env.b64 >> %OUT% 2>&1
echo scp-exit=%ERRORLEVEL% >> %OUT%
echo. >> %OUT%
echo === Decode and write .env === >> %OUT%
ssh %SSHOPTS% %HOST% "bash -c 'rm -f /opt/GamDen/.env && base64 -d /tmp/.env.b64 > /opt/GamDen/.env && wc -l /opt/GamDen/.env && rm /tmp/.env.b64'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Verify DB_PASSWORD === >> %OUT%
ssh %SSHOPTS% %HOST% "grep -E '^DB_PASSWORD=' /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Start redis service === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d redis 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 15s for redis === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 15 && docker ps --format 'table {{.Names}}\t{{.Status}}'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Restart backend === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose rm -sf gamden-backend 2>&1; docker rm -f gamden-backend 2>&1; docker compose up -d --no-deps gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Wait 30s + logs === >> %OUT%
ssh %SSHOPTS% %HOST% "sleep 30 && docker logs --tail 50 gamden-backend 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w docs=%%{http_code} http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w root=%%{http_code} http://localhost:3000/; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%