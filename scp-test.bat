@echo off
set SSHOPTS=-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o LogLevel=ERROR
set HOST=root@43.160.220.131
set OUT=d:\GamDen\scp-test-result.txt

echo === SCP test 1: .env.b64 to /tmp/.env.b64 === > %OUT%
scp %SSHOPTS% d:\GamDen\.env.b64 %HOST%:/tmp/.env.b64 >> %OUT% 2>&1
echo scp1-exit=%ERRORLEVEL% >> %OUT%
echo. >> %OUT%
echo === Verify on server === >> %OUT%
ssh %SSHOPTS% %HOST% "ls -la /tmp/.env.b64 2>&1; echo ---; wc -c /tmp/.env.b64 2>&1; echo ---; head -c 100 /tmp/.env.b64; echo" >> %OUT% 2>&1
echo === DONE === >> %OUT%
type %OUT%