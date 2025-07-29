# News Catch 控制脚本 (PowerShell 版本)
# 用于启动、停止和管理 News Catch 新闻抓取系统

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Option = ""
)

# 配置
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ProjectDir "news-catch.pid"
$LogFile = Join-Path $ProjectDir "logs\news-catch.log"
$EnvFile = Join-Path $ProjectDir ".env.server"
$DataDir = Join-Path $ProjectDir "data"

# 日志函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查依赖
function Test-Dependencies {
    Write-Info "检查依赖..."
    
    try {
        $nodeVersion = node -v
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 18) {
            Write-Error "Node.js 版本过低，需要 18+，当前版本: $nodeVersion"
            exit 1
        }
    }
    catch {
        Write-Error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    }
    
    try {
        pnpm --version | Out-Null
    }
    catch {
        Write-Error "pnpm 未安装，请先安装 pnpm"
        exit 1
    }
    
    Write-Success "依赖检查通过"
}

# 初始化项目
function Initialize-Project {
    Write-Info "初始化项目..."
    
    Set-Location $ProjectDir
    
    # 创建必要的目录
    if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" }
    if (!(Test-Path "data")) { New-Item -ItemType Directory -Path "data" }
    if (!(Test-Path "data\images")) { New-Item -ItemType Directory -Path "data\images" }
    
    # 检查 package.json
    if (!(Test-Path "package.json")) {
        Write-Error "package.json 不存在，请确保在正确的项目目录中"
        exit 1
    }
    
    # 安装依赖
    if (!(Test-Path "node_modules")) {
        Write-Info "安装依赖..."
        pnpm install
    }
    
    # 创建环境配置文件
    if (!(Test-Path $EnvFile)) {
        Write-Info "创建环境配置文件..."
        Copy-Item ".env.example" $EnvFile
        Write-Warn "请编辑 $EnvFile 配置环境变量"
    }
    
    Write-Success "项目初始化完成"
}

# 初始化数据库
function Initialize-Database {
    Write-Info "初始化数据库和默认新闻源..."
    Set-Location $ProjectDir
    
    pnpm run init-sources
    
    Write-Success "数据库初始化完成"
}

# 检查进程是否运行
function Test-ServiceRunning {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            $process = Get-Process -Id $pid -ErrorAction Stop
            return $true
        }
        catch {
            Remove-Item $PidFile -Force
            return $false
        }
    }
    return $false
}

# 启动服务
function Start-Service {
    Write-Info "启动 News Catch 服务..."
    
    if (Test-ServiceRunning) {
        $pid = Get-Content $PidFile
        Write-Warn "服务已经在运行中 (PID: $pid)"
        return
    }
    
    Set-Location $ProjectDir
    
    # 确保日志目录存在
    if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" }
    
    # 启动服务
    Write-Info "正在启动服务..."
    $process = Start-Process -FilePath "pnpm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile
    
    # 保存 PID
    $process.Id | Out-File -FilePath $PidFile -Encoding utf8
    
    # 等待服务启动
    Start-Sleep -Seconds 3
    
    if (Test-ServiceRunning) {
        Write-Success "服务启动成功 (PID: $($process.Id))"
        Write-Info "日志文件: $LogFile"
        Write-Info "健康检查: http://localhost:3000/health"
    }
    else {
        Write-Error "服务启动失败，请检查日志: $LogFile"
        exit 1
    }
}

# 停止服务
function Stop-Service {
    Write-Info "停止 News Catch 服务..."
    
    if (!(Test-ServiceRunning)) {
        Write-Warn "服务未运行"
        return
    }
    
    $pid = Get-Content $PidFile
    Write-Info "正在停止服务 (PID: $pid)..."
    
    try {
        $process = Get-Process -Id $pid
        $process.CloseMainWindow()
        
        # 等待进程结束
        $count = 0
        while (!$process.HasExited -and $count -lt 10) {
            Start-Sleep -Seconds 1
            $count++
        }
        
        # 如果进程仍在运行，强制杀死
        if (!$process.HasExited) {
            Write-Warn "强制停止服务..."
            $process.Kill()
        }
    }
    catch {
        Write-Warn "进程可能已经停止"
    }
    
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Success "服务已停止"
}

# 重启服务
function Restart-Service {
    Write-Info "重启 News Catch 服务..."
    Stop-Service
    Start-Sleep -Seconds 2
    Start-Service
}

# 查看服务状态
function Get-ServiceStatus {
    if (Test-ServiceRunning) {
        $pid = Get-Content $PidFile
        Write-Success "服务正在运行 (PID: $pid)"
        
        # 检查健康状态
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "服务健康检查通过"
            }
            else {
                Write-Warn "服务健康检查失败"
            }
        }
        catch {
            Write-Warn "无法连接到服务"
        }
    }
    else {
        Write-Warn "服务未运行"
    }
}

# 查看日志
function Show-Logs {
    param([string]$Follow)
    
    if (Test-Path $LogFile) {
        if ($Follow -eq "-f") {
            Write-Info "实时查看日志 (Ctrl+C 退出)..."
            Get-Content $LogFile -Wait
        }
        else {
            Write-Info "显示最近 50 行日志..."
            Get-Content $LogFile -Tail 50
        }
    }
    else {
        Write-Warn "日志文件不存在: $LogFile"
    }
}

# 运行演示
function Start-Demo {
    Write-Info "运行 News Catch 演示..."
    Set-Location $ProjectDir
    pnpm run demo
}

# 运行测试
function Start-Tests {
    Write-Info "运行测试..."
    Set-Location $ProjectDir
    pnpm run test:run
}

# 清理数据
function Clear-Data {
    $response = Read-Host "这将删除所有抓取的数据，确定要继续吗? (y/N)"
    if ($response -match "^[Yy]$") {
        Write-Info "清理数据..."
        if (Test-Path $DataDir) {
            Remove-Item $DataDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $DataDir -Force
        New-Item -ItemType Directory -Path "$DataDir\images" -Force
        Write-Success "数据清理完成"
    }
    else {
        Write-Info "操作已取消"
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "News Catch 控制脚本 (PowerShell 版本)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法: .\news-catch.ps1 [命令] [选项]" -ForegroundColor White
    Write-Host ""
    Write-Host "命令:" -ForegroundColor Yellow
    Write-Host "  init        初始化项目和依赖"
    Write-Host "  init-db     初始化数据库和默认新闻源"
    Write-Host "  start       启动服务"
    Write-Host "  stop        停止服务"
    Write-Host "  restart     重启服务"
    Write-Host "  status      查看服务状态"
    Write-Host "  logs        查看日志 (使用 -f 参数实时查看)"
    Write-Host "  demo        运行演示"
    Write-Host "  test        运行测试"
    Write-Host "  clean       清理数据"
    Write-Host "  help        显示帮助信息"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  .\news-catch.ps1 init          # 初始化项目"
    Write-Host "  .\news-catch.ps1 start         # 启动服务"
    Write-Host "  .\news-catch.ps1 logs -f       # 实时查看日志"
    Write-Host "  .\news-catch.ps1 status        # 查看状态"
    Write-Host ""
}

# 主函数
switch ($Command.ToLower()) {
    "init" {
        Test-Dependencies
        Initialize-Project
    }
    "init-db" {
        Initialize-Database
    }
    "start" {
        Test-Dependencies
        Start-Service
    }
    "stop" {
        Stop-Service
    }
    "restart" {
        Test-Dependencies
        Restart-Service
    }
    "status" {
        Get-ServiceStatus
    }
    "logs" {
        Show-Logs $Option
    }
    "demo" {
        Test-Dependencies
        Start-Demo
    }
    "test" {
        Test-Dependencies
        Start-Tests
    }
    "clean" {
        Clear-Data
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error "未知命令: $Command"
        Show-Help
        exit 1
    }
}