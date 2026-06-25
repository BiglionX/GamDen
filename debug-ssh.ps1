$ErrorActionPreference = "Stop"
$IdentityFile = "$env:USERPROFILE\.ssh\id_rsa"
$ProjectDir = "/opt/GamDen"

function Invoke-SshRemote([string]$remoteCmd, [int]$timeoutSec = 30) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh.exe"
    $psi.Arguments = "-i `"$IdentityFile`" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new root@43.160.220.131 `"$remoteCmd`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $null = $p.Start()
    $exited = $p.WaitForExit($timeoutSec * 1000)
    if (-not $exited) { $p.Kill() }
    return @{ ExitCode = $p.ExitCode; Stdout = $p.StandardOutput.ReadToEnd(); Stderr = $p.StandardError.ReadToEnd() }
}

function Show([string]$title, [hashtable]$r) {
    Write-Host "===== $title =====" -ForegroundColor Cyan
    Write-Host $r.Stdout
    if ($r.Stderr -and $r.Stderr.Trim()) {
        Write-Host "[STDERR]:" -ForegroundColor Yellow
        Write-Host $r.Stderr -ForegroundColor Yellow
    }
}

Show "1. /opt/GamDen tree" (Invoke-SshRemote "ls -la ${ProjectDir} 2>&1 | head -40")
Show "2. /opt/GamDen/backend" (Invoke-SshRemote "ls -la ${ProjectDir}/backend 2>&1 | head -20")
Show "3. /opt/GamDen/gamden-backend" (Invoke-SshRemote "ls -la ${ProjectDir}/gamden-backend 2>&1 | head -20")
Show "4. /opt/GamDen/.env" (Invoke-SshRemote "ls -la ${ProjectDir}/.env 2>&1; echo '---KEYS---'; grep -E '^(PUSH_|UNIPUSH_|NODE_ENV|PORT|DB_)' ${ProjectDir}/.env 2>&1 | head -15")
Show "5. docker ps" (Invoke-SshRemote "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1")
Show "6. git log" (Invoke-SshRemote "cd ${ProjectDir}; git log --oneline -3 2>&1; echo '---REMOTE---'; git remote -v 2>&1; echo '---STATUS---'; git status -s 2>&1 | head -20")
Show "7. docker-compose backend config" (Invoke-SshRemote "grep -A8 'gamden-backend:' ${ProjectDir}/docker-compose.yml 2>&1")
