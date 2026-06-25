#requires -Version 5.1
if (Get-Module -ListAvailable -Name PSReadLine) {
    Remove-Module PSReadLine -Force -ErrorAction SilentlyContinue
}

$ErrorActionPreference = 'Continue'
$RemoteHost = '43.160.220.131'
$RemoteUser = 'root'
$IdentityFile = 'C:\Users\Administrator\.ssh\id_rsa'
$OutLog = 'd:\GamDen\inspect-server.log'

# clear log
'' | Out-File -FilePath $OutLog -Encoding utf8 -Force

function Log-Line {
    param([string]$Line)
    Write-Host $Line
    Add-Content -Path $OutLog -Value $Line -Encoding utf8
}

function Invoke-SshCmd {
    param(
        [Parameter(Mandatory = $true)][string]$RemoteCmd,
        [int]$TimeoutSec = 45
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'ssh.exe'
    $psi.Arguments = "-i `"$IdentityFile`" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -o BatchMode=yes -T ${RemoteUser}@${RemoteHost} `"$RemoteCmd`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $p.Start() | Out-Null
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $exited = $p.WaitForExit($TimeoutSec * 1000)
    if (-not $exited) {
        try { $p.Kill() } catch {}
        return @{ ExitCode = -1; Stdout = $stdout; Stderr = ("[TIMEOUT] " + $stderr) }
    }
    $p.Close()
    return @{ ExitCode = $p.ExitCode; Stdout = $stdout; Stderr = $stderr }
}

function Run-Block {
    param([string]$Title, [string]$RemoteCmd)
    Log-Line ''
    Log-Line "========== $Title =========="
    Log-Line "CMD: $RemoteCmd"
    $r = Invoke-SshCmd -RemoteCmd $RemoteCmd
    Log-Line ("EXIT: " + $r.ExitCode)
    if ($r.Stdout) { Log-Line '--- STDOUT ---'; Log-Line $r.Stdout.TrimEnd() }
    if ($r.Stderr) { Log-Line '--- STDERR ---'; Log-Line $r.Stderr.TrimEnd() }
}

try {
    Run-Block -Title 'STEP 1: ls /opt/GamDen' -RemoteCmd 'ls -la /opt/GamDen/ 2>&1 | head -50'
    Run-Block -Title 'STEP 2: docker ps' -RemoteCmd 'docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}" 2>&1 | head -30'
    Run-Block -Title 'STEP 3: gamden-backend' -RemoteCmd 'ls -la /opt/GamDen/gamden-backend/ 2>&1 | head -30'
    Run-Block -Title 'STEP 4: env' -RemoteCmd 'cd /opt/GamDen && grep -E "PUSH_|UNIPUSH_|DATABASE_URL" .env gamden-backend/.env 2>/dev/null | head -20'
    Run-Block -Title 'STEP 5: git' -RemoteCmd 'cd /opt/GamDen && git log --oneline -3 2>&1; echo ---STATUS---; git status -sb 2>&1'
    Run-Block -Title 'STEP 6: compose' -RemoteCmd 'cd /opt/GamDen && grep -A3 "backend:" docker-compose.yml 2>&1 | head -20'
    Log-Line ''
    Log-Line '========== DONE =========='
} catch {
    Log-Line ("[FATAL] " + $_.Exception.Message)
}
