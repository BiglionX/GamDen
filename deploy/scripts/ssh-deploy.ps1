# GamDen项目SSH一键部署脚本 (Windows PowerShell版本)
# 作者: BiglionX
# 版本: 1.0
# 描述: Windows环境下的GamDen项目SSH部署脚本

param(
    [string]$ServerUser = "root",
    [string]$ServerIP = "43.160.220.131", 
    [string]$ProjectDir = "/var/www/gamden",
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 3000,
    [int]$MarketingPort = 3002,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipMarketing,
    [switch]$SkipDatabase,
    [switch]$Production,
    [switch]$DryRun,
    [switch]$Help
)

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Info($Message) {
    Write-ColorOutput Blue "[INFO] $Message"
}

function Write-Success($Message) {
    Write-ColorOutput Green "[SUCCESS] $Message"
}

function Write-Warning($Message) {
    Write-ColorOutput Yellow "[WARNING] $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "[ERROR] $Message"
}

# 显示帮助信息
function Show-Help {
    Write-Output @"
GamDen项目SSH一键部署脚本 (Windows PowerShell版本)

使用方法:
    .\ssh-deploy.ps1 [参数]

参数:
    -ServerUser USER         服务器用户名 (默认: root)
    -ServerIP IP             服务器IP地址 (默认: 43.160.220.131)
    -ProjectDir DIRECTORY    项目部署目录 (默认: /var/www/gamden)
    -BackendPort PORT        后端服务端口 (默认: 3001)
    -FrontendPort PORT       前端服务端口 (默认: 3000)
    -MarketingPort PORT      营销网站端口 (默认: 3002)
    -SkipBackend             跳过后端部署
    -SkipFrontend            跳过前端部署
    -SkipMarketing           跳过营销网站部署
    -SkipDatabase            跳过数据库设置
    -Production              生产环境模式
    -DryRun                  预览模式，不实际执行
    -Help                    显示此帮助信息

示例:
    .\ssh-deploy.ps1                                    # 使用默认配置部署
    .\ssh-deploy.ps1 -ServerIP "192.168.1.100"         # 指定服务器信息
    .\ssh-deploy.ps1 -Production -SkipDatabase          # 生产环境，跳过数据库
    .\ssh-deploy.ps1 -DryRun                             # 预览部署步骤

依赖要求:
    - OpenSSH客户端 (Windows 10/11内置或单独安装)
    - Git for Windows (包含scp, ssh等工具)
    - Node.js 和 npm

"@
}

# 检查依赖
function Test-Dependencies {
    Write-Info "检查部署依赖..."
    
    $dependencies = @("ssh", "scp", "tar")
    $missingDeps = @()
    
    foreach ($dep in $dependencies) {
        if (-not (Get-Command $dep -ErrorAction SilentlyContinue)) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Error "缺少必要依赖: $($missingDeps -join ', ')"
        Write-Info "请确保已安装OpenSSH客户端和Git for Windows"
        exit 1
    }
    
    Write-Success "依赖检查通过"
}

# SSH连接测试
function Test-SSHConnection {
    Write-Info "测试SSH连接到 $ServerUser@$ServerIP"
    
    if ($DryRun) {
        Write-Info "[DRY RUN] 将测试SSH连接"
        return
    }
    
    try {
        ssh -o ConnectTimeout=10 -o BatchMode=yes "${ServerUser}@${ServerIP}" "echo 'SSH连接成功'"
        Write-Success "SSH连接测试通过"
    }
    catch {
        Write-Error "SSH连接失败，请检查服务器信息和SSH密钥配置"
        exit 1
    }
}

# 创建项目目录结构
function New-ProjectStructure {
    Write-Info "创建项目目录结构: $ProjectDir"
    
    if ($DryRun) {
        Write-Info "[DRY RUN] 将创建项目目录结构"
        return
    }
    
    $commands = @"
        sudo mkdir -p $ProjectDir/{backend,frontend,marketing-site,database,nginx,scripts,logs,ssl}
        sudo chown -R `$USER:`$USER $ProjectDir
        mkdir -p $ProjectDir/logs/{backend,frontend,marketing,nginx}
"@
    
    ssh "${ServerUser}@${ServerIP}" $commands
    Write-Success "项目目录结构创建完成"
}

# 主函数
function Main {
    if ($Help) {
        Show-Help
        exit 0
    }
    
    # 生产环境配置调整
    if ($Production) {
        $BackendPort = 8000
        $FrontendPort = 80
        $MarketingPort = 8080
        Write-Info "生产环境模式启用"
    }
    
    Write-Output "======================================"
    Write-Output "    GamDen项目SSH一键部署脚本 (Windows)"
    Write-Output "======================================"
    Write-Output "服务器: ${ServerUser}@${ServerIP}"
    Write-Output "项目目录: $ProjectDir"
    Write-Output "后端端口: $BackendPort"
    Write-Output "前端端口: $FrontendPort"
    Write-Output "营销网站端口: $MarketingPort"
    Write-Output "生产模式: $Production"
    Write-Output "预览模式: $DryRun"
    Write-Output "======================================"
    Write-Output ""
    
    if (-not $DryRun) {
        # 确认部署
        Write-Output "即将开始部署，这将会："
        Write-Output "  1. 测试SSH连接"
        Write-Output "  2. 创建项目目录结构"
        if (-not $SkipBackend) { Write-Output "  3. 部署后端服务" }
        if (-not $SkipFrontend) { Write-Output "  4. 部署前端应用" } 
        if (-not $SkipMarketing) { Write-Output "  5. 部署营销网站" }
        if (-not $SkipDatabase) { Write-Output "  6. 设置数据库" }
        Write-Output "  7. 配置环境变量"
        Write-Output "  8. 构建项目"
        Write-Output "  9. 配置并启动服务"
        Write-Output ""
        
        $confirmation = Read-Host "确认继续部署? (y/N)"
        if ($confirmation -notmatch '^[Yy]') {
            Write-Info "部署已取消"
            exit 0
        }
    }
    
    # 执行部署步骤
    Test-Dependencies
    Test-SSHConnection
    New-ProjectStructure
    
    # TODO: 添加更多的部署步骤
    # 这里可以继续添加文件传输、依赖安装、构建等步骤
    
    Write-Warning "Windows版本部署脚本功能还在完善中..."
    Write-Info "建议使用Linux bash版本: deploy/scripts/ssh-deploy-main.sh"
    
    Write-Success "部署脚本执行完成!"
}

# 脚本入口
Main