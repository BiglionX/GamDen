@echo off
chcp 65001 >nul
REM ============================================================
REM GamDen UniApp 多端编译脚本 (Windows)
REM 使用 HBuilderX CLI 进行编译
REM ============================================================

set HX_CLI=F:\HBuilderX\cli.exe
set PROJECT_PATH=d:\GamDen\gamden-app

echo ========================================
echo GamDen 多端编译工具
echo ========================================
echo.
echo 请选择要执行的操作:
echo.
echo [1] 运行 H5 开发服务器
echo [2] 运行微信小程序
echo [3] 运行 Android App (需要连接设备)
echo [4] 构建 H5 生产版本
echo [5] 构建微信小程序
echo [6] 构建 Android App
echo [7] 打开 HBuilderX
echo [0] 退出
echo.

set /p choice="请输入选项: "

if "%choice%"=="1" goto dev_h5
if "%choice%"=="2" goto dev_mp_weixin
if "%choice%"=="3" goto dev_android
if "%choice%"=="4" goto build_h5
if "%choice%"=="5" goto build_mp_weixin
if "%choice%"=="6" goto build_android
if "%choice%"=="7" goto open_hx
if "%choice%"=="0" goto end

:dev_h5
echo.
echo 启动 H5 开发服务器...
cd /d %PROJECT_PATH%
call npm run dev:h5
goto end

:dev_mp_weixin
echo.
echo 编译微信小程序...
cd /d %PROJECT_PATH%
call npm run dev:mp-weixin
echo.
echo 编译完成！输出目录: dist/dev/mp-weixin
echo 请使用微信开发者工具打开此目录
goto end

:dev_android
echo.
echo 运行 Android App...
echo 正在检查连接的设备...
%HX_CLI% devices list --platform android
echo.
%HX_CLI% launch app-android --project %PROJECT_PATH%
goto end

:build_h5
echo.
echo 构建 H5 生产版本...
cd /d %PROJECT_PATH%
call npm run build:h5
echo.
echo 构建完成！输出目录: dist/build/h5
goto end

:build_mp_weixin
echo.
echo 构建微信小程序...
cd /d %PROJECT_PATH%
call npm run build:mp-weixin
echo.
echo 构建完成！输出目录: dist/build/mp-weixin
goto end

:build_android
echo.
echo 构建 Android App...
echo 注意: 需要 HBuilderX 中配置 Android 证书
%HX_CLI% pack app-android --project %PROJECT_PATH% --iscustom true
goto end

:open_hx
echo.
echo 打开 HBuilderX...
%HX_CLI% open --project %PROJECT_PATH%
goto end

:end
echo.
pause
