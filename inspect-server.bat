@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\inspect-result.txt

echo === CHECK gamden-backend src/modules/push === > %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/gamden-backend/src/modules/push/" >> %OUT% 2>&1
echo. >> %OUT%
echo === CHECK gamden-backend .env === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/gamden-backend/.env 2>&1; echo ---CONTENT---; head -40 /opt/GamDen/gamden-backend/.env 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === CHECK docker ps === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format 'table {{.Names}}	{{.Status}}	{{.Ports}}'" >> %OUT% 2>&1
echo. >> %OUT%
echo === CHECK root .env (for backend env) === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/.env 2>&1; echo ---CONTENT---; head -40 /opt/GamDen/.env 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === CHECK docker-compose.yml backend service === >> %OUT%
ssh %SSHOPTS% %HOST% "grep -B1 -A8 'backend:' /opt/GamDen/docker-compose.yml" >> %OUT% 2>&1
echo. >> %OUT%
echo === DONE === >> %OUT%
type %OUT%
