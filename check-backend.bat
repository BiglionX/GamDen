@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\check-logs.txt

echo === Checking backend logs === > %OUT%
ssh %SSHOPTS% %HOST% "docker logs --tail 80 gamden-backend" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format 'table {{.Names}}	{{.Status}}	{{.Ports}}'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Health check === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -o /dev/null -w 'docs_HTTP=%{http_code} time=%{time_total}s' http://localhost:3000/api/v1/docs; echo; curl -s -o /dev/null -w 'root_HTTP=%{http_code}' http://localhost:3000/; echo" >> %OUT% 2>&1
echo. >> %OUT%
echo === Body sample (docs endpoint) === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s http://localhost:3000/api/v1/docs-json 2>&1 | head -c 500; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%