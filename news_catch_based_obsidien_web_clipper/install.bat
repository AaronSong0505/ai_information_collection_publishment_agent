@echo off
chcp 65001 >nul
echo 🚀 安装 News Catch 系统...
echo.

echo [1/3] 安装项目依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo [2/3] 设置 Obsidian Web Clipper...
npm run setup
if errorlevel 1 (
    echo ❌ Obsidian Web Clipper 设置失败
    pause
    exit /b 1
)

echo [3/3] 构建项目...
npm run build
if errorlevel 1 (
    echo ❌ 项目构建失败
    pause
    exit /b 1
)

echo.
echo ✅ 安装完成！
echo.
echo 现在你可以运行：
echo   npm run demo    - 运行演示
echo   npm run dev     - 启动开发模式
echo   npm start       - 启动生产模式
echo.
pause