# GamDen 部署脚本（使用Lighthouse Integration）
# 使用方法：在CodeBuddy中运行此脚本

Write-Host "🚀 开始部署GamDen到Lighthouse服务器..." -ForegroundColor Green

# 1. 检查git状态
Write-Host "`n📝 检查Git状态..." -ForegroundColor Yellow
git status

# 2. 添加所有更改
Write-Host "`n➕ 添加更改到Git..." -ForegroundColor Yellow
git add .

# 3. 提交更改
$commitMessage = Read-Host "`n请输入提交信息（默认为：feat: 完成GamDen V1.0开发）"
if ([string]::IsNullOrEmpty($commitMessage)) {
    $commitMessage = "feat: 完成GamDen V1.0开发"
}
git commit -m $commitMessage

# 4. 推送到GitHub
Write-Host "`n📤 推送到GitHub..." -ForegroundColor Yellow
git push origin main

# 5. 使用Lighthouse Integration部署
Write-Host "`n🔧 准备使用Lighthouse Integration部署..." -ForegroundColor Yellow
Write-Host "请确保在CodeBuddy中已连接Lighthouse集成" -ForegroundColor Cyan
Write-Host "服务器信息：" -ForegroundColor Cyan
Write-Host "  - IP: 43.156.133.180" -ForegroundColor Cyan
Write-Host "  - 实例ID: lhins-5x8onyrr" -ForegroundColor Cyan
Write-Host "  - 项目目录: /opt/nvwax" -ForegroundColor Cyan

# 6. 部署步骤说明
Write-Host "`n📋 部署步骤：" -ForegroundColor Green
Write-Host "1. 在CodeBuddy中调用Lighthouse Integration" -ForegroundColor White
Write-Host "2. 执行命令：cd /opt/nvwax && git pull origin main" -ForegroundColor White
Write-Host "3. 执行命令：cd /opt/nvwax && docker compose --env-file .env up -d --build" -ForegroundColor White
Write-Host "4. 等待构建完成（可轮询任务状态）" -ForegroundColor White
Write-Host "5. 检查容器状态：docker compose ps" -ForegroundColor White

Write-Host "`n✅ 部署准备完成！" -ForegroundColor Green
Write-Host "现在可以通过CodeBuddy的Lighthouse Integration执行部署命令。" -ForegroundColor Cyan

# 7. 生成Lighthouse部署命令（供参考）
Write-Host "`n📄 Lighthouse部署命令（参考）：" -ForegroundColor Yellow
Write-Host @"
# 在CodeBuddy中使用invoke_integration工具：
# 1. 拉取最新代码
execute_command: cd /opt/nvwax && git pull origin main

# 2. 重新构建并启动
execute_command: cd /opt/nvwax && docker compose --env-file .env up -d --build

# 3. 查看容器状态
execute_command: docker compose ps

# 4. 查看日志（如有错误）
execute_command: docker compose logs -f
"@ -ForegroundColor Gray
