@echo off
chcp 65001 >nul

REM ============================================================
REM GamDen 一键打包 App 脚本
REM 使用 HBuilderX 云打包（推荐）
REM ============================================================

set HX_CLI=F:\HBuilderX\cli.exe
set PROJECT_PATH=d:\GamDen\gamden-app

echo ========================================
echo GamDen App 打包工具
echo ========================================
echo.
echo 正在打开 HBuilderX...
echo.

REM 打开 HBuilderX 并导入项目
start "" "%HX_CLI%" open --project "%PROJECT_PATH%"

echo.
echo HBuilderX 已启动
echo.
echo ==================== 下一步操作 ====================
echo 1. 等待 HBuilderX 完全打开
echo 2. 在左侧项目管理器中右键点击 "gamden-app"
echo 3. 选择 "发行" -^> "原生App-云打包"
echo 4. 选择 Android，勾选 "使用自有证书"
echo 5. 证书路径: %PROJECT_PATH%\release.keystore
echo 6. 别名: gamden
echo 7. 密码: gamden2026
echo 8. 点击 "打包"
echo =======================================================
echo.
echo 打包完成后，APK 文件会发送到您填写的邮箱
echo 或者可以在 HBuilderX 控制台查看下载链接
echo.
pause
