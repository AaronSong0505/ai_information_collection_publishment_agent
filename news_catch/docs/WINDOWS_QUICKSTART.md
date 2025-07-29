# Windows 快速启动指南

## 🚀 一键启动 News Catch

### 方式一：使用批处理脚本 (推荐)

```cmd
# 1. 初始化项目
news-catch.bat init

# 2. 初始化数据库和默认新闻源
news-catch.bat init-db

# 3. 启动服务
news-catch.bat start

# 4. 查看状态
news-catch.bat status
```

### 方式二：使用 PowerShell 脚本

```powershell
# 1. 初始化项目
.\news-catch.ps1 init

# 2. 初始化数据库和默认新闻源
.\news-catch.ps1 init-db

# 3. 启动服务
.\news-catch.ps1 start

# 4. 查看状态
.\news-catch.ps1 status
```

## 📋 完整启动流程

### 1. 环境准备

确保已安装：
- Node.js 18+ ([下载地址](https://nodejs.org/))
- pnpm (`npm install -g pnpm`)

### 2. 项目初始化

```cmd
cd D:\tools_work\self-project-dev\ai_agent\news_catch
news-catch.bat init
```

这将：
- 检查 Node.js 和 pnpm 依赖
- 安装项目依赖包
- 创建必要的目录结构
- 生成环境配置文件

### 3. 数据库初始化

```cmd
news-catch.bat init-db
```

这将：
- 创建 SQLite 数据库
- 初始化数据表结构
- 添加默认新闻源（BBC、TechCrunch、Hacker News、GitHub Trending）

### 4. 启动服务

```cmd
news-catch.bat start
```

服务启动后：
- 监听端口：http://localhost:3000
- 健康检查：http://localhost:3000/health
- 日志文件：`logs/news-catch.log`

### 5. 验证运行

```cmd
# 查看服务状态
news-catch.bat status

# 查看日志
news-catch.bat logs

# 实时查看日志
news-catch.bat logs -f
```

## 🧪 测试功能

### 运行演示

```cmd
news-catch.bat demo
```

这将：
- 添加测试新闻源
- 执行一次完整的抓取流程
- 显示抓取结果

### API 测试

```cmd
# 查看所有新闻源
curl http://localhost:3000/api/sources

# 启动爬虫
curl -X POST http://localhost:3000/api/crawl -H "Content-Type: application/json" -d "{\"action\": \"start\"}"

# 查看爬虫状态
curl "http://localhost:3000/api/crawl?action=status"

# 搜索文章
curl "http://localhost:3000/api/articles?keyword=news&limit=10"
```

## 🛠️ 管理命令

### 服务控制

```cmd
news-catch.bat start     # 启动服务
news-catch.bat stop      # 停止服务
news-catch.bat restart   # 重启服务
news-catch.bat status    # 查看状态
```

### 日志管理

```cmd
news-catch.bat logs      # 查看最近日志
news-catch.bat logs -f   # 实时查看日志
```

### 数据管理

```cmd
news-catch.bat clean     # 清理所有数据
news-catch.bat test      # 运行测试
```

## 📁 目录结构

```
news_catch/
├── news-catch.bat       # Windows 批处理启动脚本
├── news-catch.ps1       # PowerShell 启动脚本
├── news-catch.sh        # Linux/Mac 启动脚本
├── logs/                # 日志文件目录
│   └── news-catch.log   # 主日志文件
├── data/                # 数据存储目录
│   ├── news_catch.db    # SQLite 数据库
│   └── images/          # 图片存储目录
├── server/              # 服务器代码
├── shared/              # 共享类型
└── scripts/             # 工具脚本
```

## 🔧 配置文件

### 环境配置 (.env.server)

```env
# 数据库路径
DATABASE_PATH=./data/news_catch.db

# 服务器端口
PORT=3000

# 开发模式
NODE_ENV=development

# 爬虫配置
MAX_CONCURRENT_CRAWLS=5
CRAWL_TIMEOUT=30000

# 缓存配置
ENABLE_CACHE=true
DEFAULT_CACHE_TTL=1800

# 图片存储
IMAGE_STORAGE_PATH=./data/images
```

## 🚨 常见问题

### 1. 端口被占用

```cmd
# 查看端口占用
netstat -ano | findstr :3000

# 修改端口（编辑 .env.server）
PORT=3001
```

### 2. 权限问题

```cmd
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. 依赖安装失败

```cmd
# 清理缓存重新安装
pnpm store prune
pnpm install
```

### 4. 服务启动失败

```cmd
# 查看详细日志
news-catch.bat logs

# 检查环境配置
type .env.server
```

## 📊 监控面板

访问以下 URL 查看系统状态：

- 健康检查：http://localhost:3000/health
- 新闻源列表：http://localhost:3000/api/sources
- 爬虫状态：http://localhost:3000/api/crawl?action=status

## 🎯 下一步

1. **添加自定义新闻源**：通过 API 添加你感兴趣的新闻网站
2. **配置抓取频率**：根据需要调整各个源的抓取间隔
3. **集成 AI 分析**：为后续的智能分析功能做准备
4. **扩展功能**：添加更多的数据处理和分析功能

## 💡 提示

- 首次运行建议先执行 `news-catch.bat demo` 测试功能
- 定期查看日志文件了解系统运行状态
- 可以通过修改 `.env.server` 调整系统配置
- 使用 `news-catch.bat clean` 可以重置所有数据重新开始