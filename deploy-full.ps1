Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  GamDen 一键部署" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 查找 bash
$bash = $null
$bashCmd = Get-Command bash -ErrorAction SilentlyContinue
if ($bashCmd) {
    $bash = $bashCmd.Source
} elseif (Test-Path "C:\Program Files\Git\bin\bash.exe") {
    $bash = "C:\Program Files\Git\bin\bash.exe"
} else {
    Write-Host "错误: 未找到 bash 环境" -ForegroundColor Red
    exit 1
}

Write-Host "Bash: $bash" -ForegroundColor Green
Write-Host ""

# 执行
& $bash "$PSScriptRoot\deploy-full.sh"
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "  部署成功！" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Red
    Write-Host "  部署失败 (Exit: $exitCode)" -ForegroundColor Red
    Write-Host "===========================================" -ForegroundColor Red
    exit $exitCode
}
