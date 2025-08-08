@echo off
chcp 65001 >nul
echo 🔧 设置 Obsidian Web Clipper 集成...
echo.

echo [1/2] 克隆 Obsidian Web Clipper...
if not exist "obsidian-clipper" (
    git clone https://github.com/obsidianmd/obsidian-clipper.git
    if errorlevel 1 (
        echo ❌ 克隆失败，请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo ✅ Obsidian Web Clipper 已存在
)

echo [2/2] 安装 Obsidian Web Clipper 依赖...
cd obsidian-clipper
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Obsidian Web Clipper 设置完成！
echo.
echo 现在你可以：
echo   1. 使用高质量的内容提取
echo   2. 支持复杂表格和数学公式
echo   3. 更好的 Markdown 转换
echo.
pause