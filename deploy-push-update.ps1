# GamDen Deployment Script - Backend Push Update
# Workflow:
#   1) SSH connectivity test
#   2) Server git pull
#   3) Check .env for UNIPUSH_* config (add placeholder if missing)
#   4) docker compose rebuild backend
#   5) Health check

$ErrorActionPreference = "Stop"
$RemoteHost = "43.160.220.131"
$RemoteUser = "root"
$ProjectDir = "/opt/gamden"
$IdentityFile = "$env:USERPROFILE\.ssh\id_rsa"

function Invoke-SshRemote([string]$remoteCmd, [int]$timeoutSec = 60) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh.exe"
    $psi.Arguments = "-i `"$IdentityFile`" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes ${RemoteUser}@${RemoteHost} `"$remoteCmd`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $null = $p.Start()
    $exited = $p.WaitForExit($timeoutSec * 1000)
    if (-not $exited) {
        $p.Kill()
        throw "ssh timeout (${timeoutSec}s)"
    }
    return @{
        ExitCode = $p.ExitCode
        Stdout   = $p.StandardOutput.ReadToEnd()
        Stderr   = $p.StandardError.ReadToEnd()
    }
}

function Step([string]$title) {
    Write-Host ""
    Write-Host "===== $title =====" -ForegroundColor Cyan
}

function Ok([string]$msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Warn([string]$msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Fail([string]$msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    throw $msg
}

# ========== 1. SSH connectivity test ==========
Step "1/7 SSH connectivity test"
$r = Invoke-SshRemote "echo CONNECT_OK; id"
if ($r.ExitCode -ne 0) { Fail "ssh exit=$($r.ExitCode): $($r.Stderr)" }
if ($r.Stdout -notmatch "CONNECT_OK") { Fail "ssh did not return CONNECT_OK" }
Ok "connected, uid=$([regex]::Match($r.Stdout, 'uid=(\S+)').Groups[1].Value)"

# ========== 2. git pull ==========
Step "2/7 git pull on server"
$r = Invoke-SshRemote "cd ${ProjectDir}; git fetch origin master 2>&1; echo '---PULL---'; git pull origin master 2>&1"
Write-Host $r.Stdout
if ($r.ExitCode -ne 0) {
    Warn "git pull failed - server may have local changes to reset"
    Write-Host $r.Stderr -ForegroundColor Yellow
}
Ok "git pull done"

# ========== 3. .env check + UNIPUSH placeholder ==========
Step "3/7 Check .env"
$r = Invoke-SshRemote "ls -la ${ProjectDir}/.env 2>&1"
Write-Host $r.Stdout

$r = Invoke-SshRemote "grep -c '^UNIPUSH_' ${ProjectDir}/.env 2>/dev/null; grep -c '^PUSH_USE_MOCK' ${ProjectDir}/.env 2>/dev/null; echo END"
$envHasUnipush = $false
if ($r.Stdout -match "^\s*(\d+)") {
    $count = [int]$matches[1]
    if ($count -gt 0) {
        $envHasUnipush = $true
        Ok ".env already has UNIPUSH_* config ($count entries)"
    }
}

if (-not $envHasUnipush) {
    Warn ".env missing UNIPUSH config, appending placeholders"
    $appendCmd = "if [ -f ${ProjectDir}/.env ]; then " +
        "grep -q '^PUSH_USE_MOCK=' ${ProjectDir}/.env || echo 'PUSH_USE_MOCK=true' >> ${ProjectDir}/.env; " +
        "grep -q '^UNIPUSH_APPID=' ${ProjectDir}/.env || echo 'UNIPUSH_APPID=' >> ${ProjectDir}/.env; " +
        "grep -q '^UNIPUSH_APPKEY=' ${ProjectDir}/.env || echo 'UNIPUSH_APPKEY=' >> ${ProjectDir}/.env; " +
        "grep -q '^UNIPUSH_MASTERSECRET=' ${ProjectDir}/.env || echo 'UNIPUSH_MASTERSECRET=' >> ${ProjectDir}/.env; " +
        "grep -q '^UNIPUSH_API_BASE=' ${ProjectDir}/.env || echo 'UNIPUSH_API_BASE=https://api.getui.com' >> ${ProjectDir}/.env; " +
        "grep -q '^UNIPUSH_REST_BASE=' ${ProjectDir}/.env || echo 'UNIPUSH_REST_BASE=https://restapi.getui.com' >> ${ProjectDir}/.env; " +
        "echo 'OK: UNIPUSH placeholders appended'; " +
        "else echo 'SKIP: .env does not exist'; fi"
    $r = Invoke-SshRemote $appendCmd
    Write-Host $r.Stdout
}

$r = Invoke-SshRemote "grep -E '^(PUSH_|UNIPUSH_|NODE_ENV)' ${ProjectDir}/.env 2>&1 | sed 's/MASTERSECRET=.*/MASTERSECRET=***MASKED***/; s/APPKEY=.*/APPKEY=***MASKED***/'"
Write-Host $r.Stdout

# ========== 4. Check backend dirs ==========
Step "4/7 Check backend dirs"
$r = Invoke-SshRemote "ls -la ${ProjectDir}/gamden-backend/package.json 2>&1; echo '---OLD---'; ls -la ${ProjectDir}/backend/package.json 2>&1"
Write-Host $r.Stdout

$r = Invoke-SshRemote "test -d ${ProjectDir}/gamden-backend && echo HAS_NEW || echo NO_NEW"
$hasNewBackend = $r.Stdout.Trim() -eq "HAS_NEW"
if ($hasNewBackend) {
    Ok "New NestJS backend dir ready"
} else {
    Warn "gamden-backend dir missing - git pull may have failed"
}

# ========== 5. Rebuild + restart backend container ==========
Step "5/7 Rebuild backend image + restart"
Write-Host "[INFO] This rebuilds gamden-backend image (3-8 min)" -ForegroundColor Yellow
Write-Host "[INFO] Current docker-compose config:" -ForegroundColor Yellow
$r = Invoke-SshRemote "grep -A2 'gamden-backend:' ${ProjectDir}/docker-compose.yml | head -10"
Write-Host $r.Stdout

Write-Host "[INFO] Step 5a: docker compose up --build gamden-backend..." -ForegroundColor Yellow
$r = Invoke-SshRemote "cd ${ProjectDir}; docker compose --env-file .env up -d --no-deps --build gamden-backend 2>&1 | tail -30"
Write-Host $r.Stdout
if ($r.ExitCode -ne 0) {
    Warn "build failed, try restart only"
    $r = Invoke-SshRemote "cd ${ProjectDir}; docker compose --env-file .env restart gamden-backend 2>&1"
    Write-Host $r.Stdout
}

# ========== 6. Health check ==========
Step "6/7 Wait for backend healthy"
$healthy = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    $r = Invoke-SshRemote "docker inspect --format='{{.State.Running}}' gamden-backend 2>&1; echo '---'; docker exec gamden-nginx sh -c 'wget -qO- http://gamden-backend:3000/health 2>/dev/null' 2>&1"
    if ($r.Stdout -match "true" -and $r.Stdout -match "ok") {
        Ok ("backend healthy (" + ($i * 2) + "s)")
        $healthy = $true
        break
    }
    if ($i % 3 -eq 0) { Write-Host ('[WAIT] ' + ($i * 2) + 's ...') -ForegroundColor Yellow }
}
if (-not $healthy) {
    Warn "Not ready in 60s, see logs:"
    $r = Invoke-SshRemote "docker logs --tail 30 gamden-backend 2>&1"
    Write-Host $r.Stdout
}

# ========== 7. Verify push module ==========
Step "7/7 Verify push module"
$r = Invoke-SshRemote "docker exec gamden-backend sh -c 'ls /app/dist/modules/push/ 2>&1' | head -20"
Write-Host $r.Stdout

$r = Invoke-SshRemote "docker logs gamden-backend 2>&1 | grep -E 'unipush|PushService|mock' | head -10"
Write-Host $r.Stdout

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Follow-up manual steps:" -ForegroundColor Yellow
Write-Host "  1) Login https://dev.dcloud.net.cn to get UNIPUSH credentials" -ForegroundColor Yellow
Write-Host "  2) Fill server .env: UNIPUSH_APPID / APPKEY / MASTERSECRET" -ForegroundColor Yellow
Write-Host "  3) Set PUSH_USE_MOCK=false" -ForegroundColor Yellow
Write-Host "  4) docker compose restart gamden-backend" -ForegroundColor Yellow
Write-Host ""
