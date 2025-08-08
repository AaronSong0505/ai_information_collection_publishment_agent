@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 新闻抓取系统启动脚本
echo ==========================

:: 检查 Node.js
echo [INFO] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 未安装，请先安装 Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js 版本过低，需要 18+
    pause
    exit /b 1
)

echo [SUCCESS] Node.js 版本检查通过

:: 检查依赖
echo [INFO] 检查项目依赖...
if not exist "node_modules" (
    echo [WARN] 依赖未安装，正在安装...
    npm install
    if errorlevel 1 (
        echo [ERROR] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [SUCCESS] 依赖检查完成

:: 创建必要目录
echo [INFO] 创建必要目录...
if not exist "data" mkdir data
if not exist "data\images" mkdir data\images
if not exist "config" mkdir config
if not exist "logs" mkdir logs
if not exist "backup" mkdir backup

echo [SUCCESS] 目录创建完成

:: 构建项目
echo [INFO] 构建项目...
npm run build
if errorlevel 1 (
    echo [ERROR] 项目构建失败
    pause
    exit /b 1
)

echo [SUCCESS] 项目构建完成

:: 启动系统
echo [INFO] 启动新闻抓取系统...

:: 检查是否已有进程在运行
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | find /I "node.exe" >nul
if not errorlevel 1 (
    echo [WARN] 可能已有 Node.js 进程在运行
)

:: 启动系统
npm start

echo [SUCCESS] 🎉 系统启动完成！
pause