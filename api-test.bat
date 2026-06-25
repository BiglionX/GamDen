@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\api-test-result.txt

echo === Test API endpoints === > %OUT%
ssh %SSHOPTS% %HOST% "curl -s -w '\nHTTP=%%{http_code}\n' http://localhost:3000/api/v1/docs" >> %OUT% 2>&1
echo. >> %OUT%
echo === /api/v1/docs-json (OpenAPI spec) === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -w '\nHTTP=%%{http_code}\n' http://localhost:3000/api/v1/docs-json | head -c 300; echo" >> %OUT% 2>&1
echo. >> %OUT%
echo === /api/v1/territory/info === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -w '\nHTTP=%%{http_code}\n' http://localhost:3000/api/v1/territory/info" >> %OUT% 2>&1
echo. >> %OUT%
echo === /api/v1 (root) === >> %OUT%
ssh %SSHOPTS% %HOST% "curl -s -w '\nHTTP=%%{http_code}\n' http://localhost:3000/" >> %OUT% 2>&1
echo. >> %OUT%
echo === Container health status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker inspect gamden-backend --format '{{.State.Health.Status}} {{.State.Health.FailingStreak}}' 2>&1; echo ---; docker ps --format 'table {{.Names}}\t{{.Status}}'" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%