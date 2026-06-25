@echo off
chcp 65001 >nul
REM ============================================================
REM GamDen UniApp 多端编译脚本 (Windows)
REM ============================================================

set HX_CLI=F:\HBuilderX\cli.exe
set PROJECT_PATH=d:\GamDen\gamden-app

echo ========================================
echo GamDen UniApp 编译工具
echo ========================================
echo.
echo 请选择要执行的操作:
echo.
echo [1] 运行 H5 开发服务器
echo [2] 运行微信小程序
echo [3] 构建 H5 生产版本
echo [4] 构建微信小程序
echo [5] 打开 HBuilderX 进行 App 云打包 (推荐)
echo [6] 本地打包 App 资源 (需要 Android SDK)
echo [0] 退出
echo.

set /p choice="请输入选项: "

if "%choice%"=="1" goto dev_h5
if "%choice%"=="2" goto dev_mp_weixin
if "%choice%"=="3" goto build_h5
if "%choice%"=="4" goto build_mp_weixin
if "%choice%"=="5" goto open_hx_cloudpack
if "%choice%"=="6" goto build_app_local
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
pause
goto end

:build_h5
echo.
echo 构建 H5 生产版本...
cd /d %PROJECT_PATH%
call npm run build:h5
echo.
echo 构建完成！输出目录: dist/build/h5
pause
goto end

:build_mp_weixin
echo.
echo 构建微信小程序...
cd /d %PROJECT_PATH%
call npm run build:mp-weixin
echo.
echo 构建完成！输出目录: dist/build/mp-weixin
pause
goto end

:open_hx_cloudpack
echo.
echo 打开 HBuilderX 进行云打包...
echo.
echo ==================== 云打包配置说明 ====================
echo 1. HBuilderX 会自动打开项目
echo 2. 右键点击项目 -^> 发行 -^> 原生App-云打包
echo 3. 选择 Android
echo 4. 勾选 "使用自有证书"
echo 5. 选择证书: %PROJECT_PATH%\release.keystore
echo 6. 别名: gamden
echo 7. 密码: gamden2026
echo 8. 点击打包
echo =======================================================
echo.
%HX_CLI% open --project %PROJECT_PATH%
pause
goto end

:build_app_local
echo.
echo 本地打包 App 资源...
echo 注意: 此功能需要配置 Android SDK 环境
cd /d %PROJECT_PATH%
call npm run build:app-android
if exist "dist\build\app-android" (
    echo.
    echo 构建成功！资源目录: dist\build\app-android
    echo.
    echo 接下来需要使用 Android Studio 进行打包:
    echo 1. 打开 Android Studio
    echo 2. 导入 %PROJECT_PATH%\dist\build\app-android 目录
    echo 3. 配置签名证书
    echo 4. 构建 APK
) else (
    echo 构建失败，请检查错误信息
)
pause
goto end

:end
echo.
pause
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
