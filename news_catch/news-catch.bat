@echo off
setlocal enabledelayedexpansion

REM News Catch 控制脚本 (Windows 批处理版本)
REM 用于启动、停止和管理 News Catch 新闻抓取系统

set "PROJECT_DIR=%~dp0"
set "PID_FILE=%PROJECT_DIR%news-catch.pid"
set "LOG_FILE=%PROJECT_DIR%logs\news-catch.log"
set "ENV_FILE=%PROJECT_DIR%.env.server"

REM 创建日志目录
if not exist "%PROJECT_DIR%logs" mkdir "%PROJECT_DIR%logs"
if not exist "%PROJECT_DIR%data" mkdir "%PROJECT_DIR%data"
if not exist "%PROJECT_DIR%data\images" mkdir "%PROJECT_DIR%data\images"

REM 解析命令
set "COMMAND=%1"
if "%COMMAND%"=="" set "COMMAND=help"

REM 执行命令
if /i "%COMMAND%"=="init" goto :init
if /i "%COMMAND%"=="init-db" goto :init_db
if /i "%COMMAND%"=="verify" goto :verify
if /i "%COMMAND%"=="start" goto :start
if /i "%COMMAND%"=="stop" goto :stop
if /i "%COMMAND%"=="restart" goto :restart
if /i "%COMMAND%"=="status" goto :status
if /i "%COMMAND%"=="logs" goto :logs
if /i "%COMMAND%"=="demo" goto :demo
if /i "%COMMAND%"=="test" goto :test
if /i "%COMMAND%"=="clean" goto :clean
if /i "%COMMAND%"=="help" goto :help
goto :unknown

:init
echo [INFO] 初始化项目...
cd /d "%PROJECT_DIR%"

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 未安装，请先安装 Node.js 18+
    exit /b 1
)

REM 检查 pnpm
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pnpm 未安装，请先安装 pnpm
    exit /b 1
)

REM 安装依赖
if not exist "node_modules" (
    echo [INFO] 安装依赖...
    pnpm install
)

REM 创建环境配置文件
if not exist "%ENV_FILE%" (
    echo [INFO] 创建环境配置文件...
    copy ".env.example" "%ENV_FILE%"
    echo [WARN] 请编辑 %ENV_FILE% 配置环境变量
)

echo [SUCCESS] 项目初始化完成
goto :end

:init_db
echo [INFO] 初始化数据库和默认新闻源...
cd /d "%PROJECT_DIR%"
pnpm run init-sources
echo [SUCCESS] 数据库初始化完成
goto :end

:verify
echo [INFO] 验证系统设置...
cd /d "%PROJECT_DIR%"
pnpm run verify
goto :end

:start
echo [INFO] 启动 News Catch 服务...
cd /d "%PROJECT_DIR%"

REM 检查是否已经运行
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
    tasklist /FI "PID eq !PID!" 2>nul | find "!PID!" >nul
    if not errorlevel 1 (
        echo [WARN] 服务已经在运行中 ^(PID: !PID!^)
        goto :end
    )
)

echo [INFO] 正在启动服务...
start /b pnpm run dev > "%LOG_FILE%" 2>&1

REM 等待服务启动
timeout /t 3 /nobreak >nul

echo [SUCCESS] 服务启动成功
echo [INFO] 日志文件: %LOG_FILE%
echo [INFO] 健康检查: http://localhost:3000/health
goto :end

:stop
echo [INFO] 停止 News Catch 服务...

if not exist "%PID_FILE%" (
    echo [WARN] 服务未运行
    goto :end
)

set /p PID=<"%PID_FILE%"
echo [INFO] 正在停止服务 ^(PID: %PID%^)...

taskkill /PID %PID% /T /F >nul 2>&1
del "%PID_FILE%" >nul 2>&1

echo [SUCCESS] 服务已停止
goto :end

:restart
echo [INFO] 重启 News Catch 服务...
call :stop
timeout /t 2 /nobreak >nul
call :start
goto :end

:status
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
    tasklist /FI "PID eq !PID!" 2>nul | find "!PID!" >nul
    if not errorlevel 1 (
        echo [SUCCESS] 服务正在运行 ^(PID: !PID!^)
        
        REM 检查健康状态
        curl -s http://localhost:3000/health >nul 2>&1
        if not errorlevel 1 (
            echo [SUCCESS] 服务健康检查通过
        ) else (
            echo [WARN] 服务健康检查失败
        )
    ) else (
        echo [WARN] 服务未运行
        del "%PID_FILE%" >nul 2>&1
    )
) else (
    echo [WARN] 服务未运行
)
goto :end

:logs
if exist "%LOG_FILE%" (
    if /i "%2"=="-f" (
        echo [INFO] 实时查看日志 ^(Ctrl+C 退出^)...
        powershell -Command "Get-Content '%LOG_FILE%' -Wait"
    ) else (
        echo [INFO] 显示最近日志...
        powershell -Command "Get-Content '%LOG_FILE%' -Tail 50"
    )
) else (
    echo [WARN] 日志文件不存在: %LOG_FILE%
)
goto :end

:demo
echo [INFO] 运行 News Catch 演示...
cd /d "%PROJECT_DIR%"
pnpm run demo
goto :end

:test
echo [INFO] 运行测试...
cd /d "%PROJECT_DIR%"
pnpm run test:run
goto :end

:clean
set /p "response=这将删除所有抓取的数据，确定要继续吗? (y/N): "
if /i "!response!"=="y" (
    echo [INFO] 清理数据...
    if exist "%PROJECT_DIR%data" rmdir /s /q "%PROJECT_DIR%data"
    mkdir "%PROJECT_DIR%data\images"
    echo [SUCCESS] 数据清理完成
) else (
    echo [INFO] 操作已取消
)
goto :end

:help
echo News Catch 控制脚本 ^(Windows 批处理版本^)
echo.
echo 用法: news-catch.bat [命令] [选项]
echo.
echo 命令:
echo   init        初始化项目和依赖
echo   init-db     初始化数据库和默认新闻源
echo   verify      验证系统设置
echo   start       启动服务
echo   stop        停止服务
echo   restart     重启服务
echo   status      查看服务状态
echo   logs        查看日志 ^(使用 -f 参数实时查看^)
echo   demo        运行演示
echo   test        运行测试
echo   clean       清理数据
echo   help        显示帮助信息
echo.
echo 示例:
echo   news-catch.bat init          # 初始化项目
echo   news-catch.bat start         # 启动服务
echo   news-catch.bat logs -f       # 实时查看日志
echo   news-catch.bat status        # 查看状态
echo.
goto :end

:unknown
echo [ERROR] 未知命令: %COMMAND%
call :help
exit /b 1

:end
endlocal