@echo off
chcp 65001 >nul

REM ============================================================
REM GamDen UniApp 本地打包脚本
REM 需要先在 HBuilderX 中打开项目
REM ============================================================

set HX_CLI=F:\HBuilderX\cli.exe
set PROJECT_PATH=d:\GamDen\gamden-app

echo ========================================
echo GamDen 本地打包工具
echo ========================================
echo.
echo 请确保 HBuilderX 已启动并打开项目
echo.
echo 开始本地打包...
echo.

REM 使用 HBuilderX CLI 执行本地打包
%HX_CLI% publish app-android --type appResource --project %PROJECT_PATH%

echo.
echo 打包完成！
echo 检查 dist\build\app-android 目录

if exist "%PROJECT_PATH%\dist\build\app-android" (
    echo.
    echo === 打包成功 ===
    dir "%PROJECT_PATH%\dist\build\app-android"
) else (
    echo.
    echo 打包可能失败，请检查 HBuilderX 是否正常运行
)

pause
