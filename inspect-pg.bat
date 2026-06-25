@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\inspect-pg-result.txt

echo === Inspect gamden-postgres actual config === > %OUT%
ssh %SSHOPTS% %HOST% "docker inspect gamden-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'POSTGRES'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Try connecting with gamden_secret === >> %OUT%
ssh %SSHOPTS% %HOST% "docker exec gamden-postgres psql -U gamden -d gamden -c 'SELECT version();' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Try with gamden (no password) === >> %OUT%
ssh %SSHOPTS% %HOST% "docker exec -e PGPASSWORD= gamden-postgres psql -U gamden -d gamden -c 'SELECT current_user;' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Try with gamden_secret password === >> %OUT%
ssh %SSHOPTS% %HOST% "docker exec -e PGPASSWORD=gamden_secret gamden-postgres psql -U gamden -d gamden -c 'SELECT current_user;' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Try with password from server .env === >> %OUT%
ssh %SSHOPTS% %HOST% "source /opt/GamDen/.env 2>/dev/null; echo DB_PASSWORD=$DB_PASSWORD; docker exec -e PGPASSWORD=$DB_PASSWORD gamden-postgres psql -U gamden -d gamden -c 'SELECT current_user;' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === Check if redis service is defined but not running === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'redis|gamden'" >> %OUT% 2>&1
echo. >> %OUT%
echo === Try start redis service === >> %OUT%
ssh %SSHOPTS% %HOST% "cd /opt/GamDen && docker compose up -d redis 2>&1" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%