@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\check-env-result.txt

echo === Total lines in server .env === > %OUT%
ssh %SSHOPTS% %HOST% "wc -l /opt/GamDen/.env" >> %OUT% 2>&1
echo. >> %OUT%
echo === Last 40 lines (potential old content) === >> %OUT%
ssh %SSHOPTS% %HOST% "sed -n '90,130p' /opt/GamDen/.env" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%