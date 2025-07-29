#!/bin/bash

# News Catch 控制脚本
# 用于启动、停止和管理 News Catch 新闻抓取系统

set -e

# 配置
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/news-catch.pid"
LOG_FILE="$PROJECT_DIR/logs/news-catch.log"
ENV_FILE="$PROJECT_DIR/.env.server"
DATA_DIR="$PROJECT_DIR/data"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请先安装 pnpm"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18+，当前版本: $(node -v)"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 初始化项目
init_project() {
    log_info "初始化项目..."
    
    cd "$PROJECT_DIR"
    
    # 创建必要的目录
    mkdir -p logs data/images
    
    # 检查 package.json
    if [ ! -f "package.json" ]; then
        log_error "package.json 不存在，请确保在正确的项目目录中"
        exit 1
    fi
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        pnpm install
    fi
    
    # 创建环境配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_info "创建环境配置文件..."
        cp .env.example "$ENV_FILE"
        log_warn "请编辑 $ENV_FILE 配置环境变量"
    fi
    
    log_success "项目初始化完成"
}

# 初始化数据库和默认新闻源
init_database() {
    log_info "初始化数据库和默认新闻源..."
    cd "$PROJECT_DIR"
    
    # 运行初始化脚本
    pnpm run init-sources
    
    log_success "数据库初始化完成"
}

# 检查进程是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 启动服务
start_service() {
    log_info "启动 News Catch 服务..."
    
    if is_running; then
        log_warn "服务已经在运行中 (PID: $(cat $PID_FILE))"
        return 0
    fi
    
    cd "$PROJECT_DIR"
    
    # 确保日志目录存在
    mkdir -p logs
    
    # 启动服务
    log_info "正在启动服务..."
    nohup pnpm run dev > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # 保存 PID
    echo $pid > "$PID_FILE"
    
    # 等待服务启动
    sleep 3
    
    if is_running; then
        log_success "服务启动成功 (PID: $pid)"
        log_info "日志文件: $LOG_FILE"
        log_info "健康检查: http://localhost:3000/health"
    else
        log_error "服务启动失败，请检查日志: $LOG_FILE"
        exit 1
    fi
}

# 停止服务
stop_service() {
    log_info "停止 News Catch 服务..."
    
    if ! is_running; then
        log_warn "服务未运行"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    log_info "正在停止服务 (PID: $pid)..."
    
    # 发送 SIGTERM 信号
    kill -TERM "$pid" 2>/dev/null || true
    
    # 等待进程结束
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # 如果进程仍在运行，强制杀死
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warn "强制停止服务..."
        kill -KILL "$pid" 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    log_success "服务已停止"
}

# 重启服务
restart_service() {
    log_info "重启 News Catch 服务..."
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
status_service() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log_success "服务正在运行 (PID: $pid)"
        
        # 检查健康状态
        if command -v curl &> /dev/null; then
            log_info "检查服务健康状态..."
            if curl -s http://localhost:3000/health > /dev/null; then
                log_success "服务健康检查通过"
            else
                log_warn "服务健康检查失败"
            fi
        fi
    else
        log_warn "服务未运行"
    fi
}

# 查看日志
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        if [ "$1" = "-f" ]; then
            log_info "实时查看日志 (Ctrl+C 退出)..."
            tail -f "$LOG_FILE"
        else
            log_info "显示最近 50 行日志..."
            tail -n 50 "$LOG_FILE"
        fi
    else
        log_warn "日志文件不存在: $LOG_FILE"
    fi
}

# 运行演示
run_demo() {
    log_info "运行 News Catch 演示..."
    cd "$PROJECT_DIR"
    pnpm run demo
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    cd "$PROJECT_DIR"
    pnpm run test:run
}

# 清理数据
clean_data() {
    log_warn "这将删除所有抓取的数据，确定要继续吗? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "清理数据..."
        rm -rf "$DATA_DIR"
        mkdir -p "$DATA_DIR/images"
        log_success "数据清理完成"
    else
        log_info "操作已取消"
    fi
}

# 显示帮助信息
show_help() {
    echo "News Catch 控制脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  init        初始化项目和依赖"
    echo "  init-db     初始化数据库和默认新闻源"
    echo "  start       启动服务"
    echo "  stop        停止服务"
    echo "  restart     重启服务"
    echo "  status      查看服务状态"
    echo "  logs        查看日志 (使用 -f 参数实时查看)"
    echo "  demo        运行演示"
    echo "  test        运行测试"
    echo "  clean       清理数据"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 init          # 初始化项目"
    echo "  $0 start         # 启动服务"
    echo "  $0 logs -f       # 实时查看日志"
    echo "  $0 status        # 查看状态"
    echo ""
}

# 主函数
main() {
    case "${1:-help}" in
        init)
            check_dependencies
            init_project
            ;;
        init-db)
            init_database
            ;;
        start)
            check_dependencies
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            check_dependencies
            restart_service
            ;;
        status)
            status_service
            ;;
        logs)
            view_logs "$2"
            ;;
        demo)
            check_dependencies
            run_demo
            ;;
        test)
            check_dependencies
            run_tests
            ;;
        clean)
            clean_data
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"