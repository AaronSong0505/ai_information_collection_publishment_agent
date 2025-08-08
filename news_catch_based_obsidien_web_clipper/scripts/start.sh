#!/bin/bash

# 新闻抓取系统启动脚本

set -e

# 颜色定义
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

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18+，当前版本: $(node -v)"
        exit 1
    fi
    
    log_success "Node.js 版本检查通过: $(node -v)"
}

# 检查依赖
check_dependencies() {
    log_info "检查项目依赖..."
    
    if [ ! -d "node_modules" ]; then
        log_warn "依赖未安装，正在安装..."
        npm install
    fi
    
    log_success "依赖检查完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p data/images
    mkdir -p config
    mkdir -p logs
    mkdir -p backup
    
    log_success "目录创建完成"
}

# 初始化配置
init_config() {
    log_info "初始化配置..."
    
    if [ ! -f "config/sources.json" ]; then
        log_info "创建默认新闻源配置..."
        # 这里会由程序自动创建
    fi
    
    log_success "配置初始化完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    npm run build
    
    log_success "项目构建完成"
}

# 启动系统
start_system() {
    log_info "启动新闻抓取系统..."
    
    # 检查是否已有进程在运行
    if pgrep -f "news-catch" > /dev/null; then
        log_warn "系统已在运行中"
        return
    fi
    
    # 启动系统
    npm start
}

# 主函数
main() {
    echo "🚀 新闻抓取系统启动脚本"
    echo "=========================="
    
    check_node
    check_dependencies
    create_directories
    init_config
    build_project
    start_system
    
    log_success "🎉 系统启动完成！"
}

# 运行主函数
main "$@"