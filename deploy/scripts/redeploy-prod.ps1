<#
.SYNOPSIS
    GamDen 增量重部署 — Windows PowerShell 入口

.DESCRIPTION
    在 Windows 本地把修改过的文件 scp 同步到腾讯云服务器，然后 SSH 调用
    redeploy-prod.sh 触发真正的重部署流程。

    适用场景：日常代码/配置改动后的快速上线（区别于首次部署）。

.PARAMETER Server
    服务器 IP 或域名（默认 43.160.220.131）

.PARAMETER User
    SSH 用户名（默认 root）

.PARAMETER ProjectDir
    服务器上的项目目录（默认 /opt/gamden）

.PARAMETER Domain
    生产域名（默认 gamden.matux.tech）

.PARAMETER RebuildFrontend
    重建 frontend 镜像（修改了 frontend/.env.production 或前端代码时使用）

.PARAMETER SkipSync
    跳过文件同步（只想手动触发部署流程时使用）

.PARAMETER SkipBackend
    跳过 backend 重启

.PARAMETER DryRun
    仅打印将要执行的命令，不实际执行

.EXAMPLE
    # 完整流程：同步文件 + reload nginx + 重启 backend + 健康检查
    .\redeploy-prod.ps1

.EXAMPLE
    # 只改了 nginx.conf，不想动 backend
    .\redeploy-prod.ps1 -SkipBackend:$false -RebuildFrontend:$false

.EXAMPLE
    # 改了 frontend/.env.production，必须 rebuild
    .\redeploy-prod.ps1 -RebuildFrontend

.EXAMPLE
    # 预览所有命令，不执行
    .\redeploy-prod.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [string]$Server = "43.160.220.131",
    [string]$User = "root",
    [string]$ProjectDir = "/opt/gamden",
    [string]$Domain = "gamden.matux.tech",
    [switch]$RebuildFrontend,
    [switch]$SkipSync,
    [switch]$SkipBackend,
    [switch]$SkipHealthcheck,
    [switch]$DryRun
)

# ---- 颜色 ----
function Write-Step($msg)   { Write-Host "[STEP] " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Write-Info($msg)   { Write-Host "[INFO] " -ForegroundColor Blue -NoNewline; Write-Host $msg }
function Write-Ok($msg)     { Write-Host "[ OK ] " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn($msg)   { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Write-Fail($msg)   { Write-Host "[FAIL] " -ForegroundColor Red -NoNewline; Write-Host $msg }

# ---- 解析脚本所在目录，并定位项目根目录 ----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

Write-Host ""
Write-Host "========================================"
Write-Host "  GamDen 增量重部署 (PowerShell 入口)"
Write-Host "  服务器: $User@$Server"
Write-Host "  域名:   $Domain"
Write-Host "  项目:   $ProjectDir"
Write-Host "  Rebuild frontend: $RebuildFrontend"
Write-Host "========================================"
Write-Host ""

# ---- 同步函数 ----
function Sync-File($LocalRelPath, $RemoteRelPath) {
    $Local = Join-Path $RepoRoot $LocalRelPath
    $Remote = "${User}@${Server}:${ProjectDir}/${RemoteRelPath}"

    if (-not (Test-Path $Local)) {
        Write-Warn "本地文件不存在，跳过: $Local"
        return
    }

    Write-Info "同步: $LocalRelPath → $Remote"
    if ($DryRun) { return }

    $scp = scp -o StrictHostKeyChecking=accept-new $Local $Remote
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "scp 失败: $LocalRelPath"
        throw "scp exit code: $LASTEXITCODE"
    }
}

# ---- Step 1: 同步关键文件 ----
if (-not $SkipSync) {
    Write-Step "Step 1/3: 同步修改过的文件到服务器"

    Sync-File "nginx\nginx.conf"                       "nginx/nginx.conf"
    Sync-File ".env"                                   ".env"
    Sync-File "frontend\.env.production"               "frontend/.env.production"

    # 可选：根据 -RebuildFrontend 决定是否同步整个 frontend src（代码改动时用）
    if ($RebuildFrontend) {
        Write-Info "RebuildFrontend 模式：将同步 frontend/src 完整源码"
        if (-not $DryRun) {
            $srcLocal = Join-Path $RepoRoot "frontend\src"
            $srcRemote = "${User}@${Server}:${ProjectDir}/frontend/src"
            scp -o StrictHostKeyChecking=accept-new -r $srcLocal $srcRemote
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "同步 frontend/src 失败"
                throw "scp exit code: $LASTEXITCODE"
            }
            Write-Ok "frontend/src 同步完成"
        }
    }

    Write-Ok "文件同步完成"
} else {
    Write-Warn "跳过文件同步（-SkipSync）"
}

Write-Host ""

# ---- Step 2: 给服务器脚本加执行权限 ----
Write-Step "Step 2/3: 准备服务器端部署脚本"
$chmodCmd = "chmod +x ${ProjectDir}/deploy/scripts/redeploy-prod.sh"
Write-Info "执行: ssh $User@$Server '$chmodCmd'"
if (-not $DryRun) {
    ssh -o StrictHostKeyChecking=accept-new $User@$Server $chmodCmd | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "chmod 失败，请检查项目是否已部署到 $ProjectDir"
        exit 1
    }
    Write-Ok "执行权限已设置"
}

Write-Host ""

# ---- Step 3: SSH 触发部署 ----
Write-Step "Step 3/3: 触发服务器端部署"
$remoteArgs = @()
if ($RebuildFrontend)  { $remoteArgs += "--rebuild-frontend" }
if ($SkipBackend)      { $remoteArgs += "--skip-backend" }
if ($SkipHealthcheck)  { $remoteArgs += "--skip-healthcheck" }
$remoteArgs += "--domain $Domain"
$remoteArgs += "--project-dir $ProjectDir"

$remoteCmd = "${ProjectDir}/deploy/scripts/redeploy-prod.sh $($remoteArgs -join ' ')"
Write-Info "执行: ssh $User@$Server '$remoteCmd'"
Write-Host ""

if ($DryRun) {
    Write-Warn "[DryRun 模式] 以上为预览命令，未实际执行"
    exit 0
}

# 通过 SSH 执行，实时回显
ssh -o StrictHostKeyChecking=accept-new -t $User@$Server $remoteCmd
$remoteExitCode = $LASTEXITCODE

Write-Host ""
if ($remoteExitCode -eq 0) {
    Write-Ok "部署成功 🚀"
    Write-Host ""
    Write-Host "  访问: http://$Domain"
    Write-Host "  旧域名/IP 仍兼容: http://$Server"
    Write-Host ""
} else {
    Write-Fail "部署失败，服务器端退出码: $remoteExitCode"
    exit $remoteExitCode
}
