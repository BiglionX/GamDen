@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\inspect-new.txt

echo === A: push module files === > %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/gamden-backend/src/modules/push/" >> %OUT% 2>&1
echo. >> %OUT%
echo === B: gamden-backend .env === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/gamden-backend/.env 2>&1; echo ---CONTENT---; head -50 /opt/GamDen/gamden-backend/.env 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === C: docker ps === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --format 'table {{.Names}}	{{.Status}}	{{.Ports}}'" >> %OUT% 2>&1
echo. >> %OUT%
echo === D: root .env === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/.env 2>&1; echo ---CONTENT---; head -50 /opt/GamDen/.env 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === E: docker-compose backend service === >> %OUT%
ssh %SSHOPTS% %HOST% "grep -B1 -A8 'backend:' /opt/GamDen/docker-compose.yml" >> %OUT% 2>&1
echo. >> %OUT%
echo === F: gamden-backend dockerfile === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /opt/GamDen/gamden-backend/Dockerfile /opt/GamDen/gamden-backend/package.json 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === G: backend image status === >> %OUT%
ssh %SSHOPTS% %HOST% "docker images 2>&1 | grep -E 'gamden|backend|REPOSITORY'" >> %OUT% 2>&1
echo. >> %OUT%
echo === H: which port backend listens === >> %OUT%
ssh %SSHOPTS% %HOST% "docker ps --filter name=backend --format 'table {{.Names}}	{{.Ports}}' 2>&1" >> %OUT% 2>&1
echo. >> %OUT%
echo === DONE === >> %OUT%
type %OUT%
