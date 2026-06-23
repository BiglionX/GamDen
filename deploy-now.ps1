<#
.SYNOPSIS
    GamDen 一键部署到腾讯云 Lighthouse 服务器（脚本中只输入一次密码）

.DESCRIPTION
    流程：
      1) 输入服务器 root 密码（用 SecureString 读取，不会进命令历史）
      2) scp 上传 nginx.conf / .env / frontend/.env.production / redeploy-prod.sh
      3) ssh 在服务器上 chmod + 执行 redeploy-prod.sh --rebuild-frontend
      4) 显示最终验证命令

.EXAMPLE
    .\deploy-now.ps1
#>

[CmdletBinding()]
param(
    [string]$Server = "43.160.220.131",
    [string]$User = "root",
    [string]$ProjectDir = "/opt/gamden"
)

$ErrorActionPreference = "Stop"

# ---- 颜色函数 ----
function Info($m)  { Write-Host "[INFO] " -ForegroundColor Blue -NoNewline; Write-Host $m }
function Ok($m)    { Write-Host "[ OK ] " -ForegroundColor Green -NoNewline; Write-Host $m }
function Warn($m)  { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $m }
function Fail($m)  { Write-Host "[FAIL] " -ForegroundColor Red -NoNewline; Write-Host $m }
function Step($m)  { Write-Host "[STEP] " -ForegroundColor Cyan -NoNewline; Write-Host $m }

# ---- 读取密码（SecureString，不入历史）----
Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  GamDen 一键部署 → 腾讯云 Lighthouse" -ForegroundColor White
Write-Host "  服务器: $User@$Server" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host ""

Info "请输入服务器 root 密码（输入时不可见，输入完按回车）"
$SecurePwd = Read-Host -AsSecureString "SSH Password"
if (-not $SecurePwd) {
    Fail "密码不能为空"; exit 1
}
# 转成普通字符串（仅本次进程内存中，不落盘）
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePwd)
$PlainPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) | Out-Null

Write-Host ""

# ---- 检查 ssh/scp 可用 ----
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Fail "找不到 ssh 命令，请安装 OpenSSH 客户端"; exit 1
}
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Fail "找不到 scp 命令，请安装 OpenSSH 客户端"; exit 1
}

# ---- 包装 ssh/scp 自动输入密码（用 sshpass 等价的 expect-like 机制）----
# Windows 上没有 sshpass。我们用 plink (PuTTY) 或 SSH_ASKPASS 都不直接可用。
# 替代方案：写入临时的 SSH 配置文件，启用 StrictHostKeyChecking=accept-new。
# 然后通过 .NET 的 System.Diagnostics.Process 启动 ssh/scp，
# 在 PasswordPrompted 时通过 StandardInput 写入密码。
# 这避免了密码出现在命令行（也就不会进 PSReadLine 历史）。

function Invoke-SSH([string]$remoteCmd) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    # 注意：不在 Arguments 中带密码；密码通过 stdin 注入
    $psi.Arguments = "-o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=`"$env:USERPROFILE\.ssh\known_hosts`" -o PubkeyAuthentication=no -o PreferredAuthentications=password $User@$Server $remoteCmd"
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $p.Start() | Out-Null

    # 短延迟等待 password: 提示符出现
    Start-Sleep -Milliseconds 300
    $p.StandardInput.WriteLine($PlainPwd)
    $p.StandardInput.Close()

    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()

    if ($p.ExitCode -ne 0) {
        Write-Host $stdout
        Write-Host $stderr -ForegroundColor Red
        throw "ssh 失败 exit=$($p.ExitCode)"
    }
    return $stdout
}

function Send-SCP([string]$local, [string]$remote) {
    Info "上传: $local → ${User}@${Server}:${remote}"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "scp"
    $psi.Arguments = "-o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=`"$env:USERPROFILE\.ssh\known_hosts`" -o PubkeyAuthentication=no -o PreferredAuthentications=password `"$local`" ${User}@${Server}:${remote}"
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $p.Start() | Out-Null

    Start-Sleep -Milliseconds 300
    $p.StandardInput.WriteLine($PlainPwd)
    $p.StandardInput.Close()

    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()

    if ($p.ExitCode -ne 0) {
        Write-Host $stdout
        Write-Host $stderr -ForegroundColor Red
        throw "scp 失败 exit=$($p.ExitCode)"
    }
}

# ---- Step 1: 测试连接 ----
Step "Step 1/4: 测试 SSH 连接"
try {
    $out = Invoke-SSH 'echo CONNECT_OK; uname -a'
    if ($out -notmatch "CONNECT_OK") {
        Fail "连接返回异常"; exit 1
    }
    Ok "SSH 连接成功"
    $out.Split("`n") | Select-Object -First 1 | Write-Host -ForegroundColor DarkGray
} catch {
    Fail "SSH 连接失败，请检查密码/服务器状态"
    exit 1
}

Write-Host ""

# ---- Step 2: 创建远端目录 ----
Step "Step 2/4: 准备远端目录"
Invoke-SSH "mkdir -p ${ProjectDir}/nginx ${ProjectDir}/frontend ${ProjectDir}/deploy/scripts" | Out-Null
Ok "目录已创建"

Write-Host ""

# ---- Step 3: 上传文件 ----
Step "Step 3/4: 上传修改过的文件"

$RepoRoot = (Get-Location).Path
if (-not (Test-Path "$RepoRoot\nginx\nginx.conf")) {
    Fail "请在 d:\GamDen 项目根目录下运行此脚本"; exit 1
}

# 配置文件
Send-SCP "$RepoRoot\nginx\nginx.conf"                          "${ProjectDir}/nginx/nginx.conf"
Send-SCP "$RepoRoot\.env"                                      "${ProjectDir}/.env"
Send-SCP "$RepoRoot\frontend\.env.production"                  "${ProjectDir}/frontend/.env.production"

# 服务器端部署脚本
Send-SCP "$RepoRoot\deploy\scripts\redeploy-prod.sh"           "${ProjectDir}/deploy/scripts/redeploy-prod.sh"

Ok "全部文件上传完成"

Write-Host ""

# ---- Step 4: 触发服务器端部署 ----
Step "Step 4/4: 在服务器执行部署（rebuild frontend + 健康检查）"
Invoke-SSH "chmod +x ${ProjectDir}/deploy/scripts/redeploy-prod.sh; ${ProjectDir}/deploy/scripts/redeploy-prod.sh --rebuild-frontend --project-dir ${ProjectDir}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Ok "部署完成 🚀"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "验证命令（复制粘贴到 PowerShell 跑）:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  (Invoke-WebRequest -Uri "http://gamden.matux.tech/health" -UseBasicParsing).Content' -ForegroundColor Cyan
Write-Host '  (Invoke-WebRequest -Uri "http://gamden.matux.tech/" -UseBasicParsing).Content | Select-String "GamDen|巢穴|领地"' -ForegroundColor Cyan
Write-Host '  (Invoke-WebRequest -Uri "http://gamden.matux.tech/api/territory/info" -UseBasicParsing).Content' -ForegroundColor Cyan
Write-Host ""

# 清空内存中的密码
$PlainPwd = $null
[System.GC]::Collect()
