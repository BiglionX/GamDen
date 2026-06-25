# 调试 SSH 连接 - 显式指定 id_rsa
$ErrorActionPreference = "Stop"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh.exe"
$psi.Arguments = '-i C:\Users\Administrator\.ssh\id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new root@43.160.220.131 "echo HELLO_FROM_SERVER; id; uname -a"'
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $psi
$null = $p.Start()
$exited = $p.WaitForExit(30000)
if (-not $exited) { $p.Kill() }

Write-Host "Exited: $exited, ExitCode: $($p.ExitCode)"
Write-Host "--- STDOUT ---"
Write-Host $p.StandardOutput.ReadToEnd()
Write-Host "--- STDERR ---"
Write-Host $p.StandardError.ReadToEnd()
