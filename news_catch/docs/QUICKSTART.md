# 快速启动指南

## 1. 安装依赖

```bash
cd news_catch
pnpm install
```

## 2. 配置环境

```bash
cp .env.example .env.server
```

## 3. 初始化数据库和默认新闻源

```bash
pnpm run init-sources
```

## 4. 启动开发服务器

```bash
pnpm run dev
```

服务器将在 http://localhost:3000 启动

## 5. 测试 API

### 查看健康状态
```bash
curl http://localhost:3000/health
```

### 查看所有新闻源
```bash
curl http://localhost:3000/api/sources
```

### 启动爬虫
```bash
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### 查看爬虫状态
```bash
curl http://localhost:3000/api/crawl?action=status
```

### 搜索文章
```bash
curl "http://localhost:3000/api/articles?keyword=news&limit=10"
```

## 6. 添加新的新闻源

```bash
curl -X POST http://localhost:3000/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example RSS",
    "url": "https://example.com/rss.xml",
    "type": "rss",
    "enabled": true,
    "interval": 300,
    "config": {}
  }'
```

## 7. Docker 部署

```bash
# 构建镜像
pnpm run docker:build

# 启动服务
pnpm run docker:run

# 停止服务
pnpm run docker:stop
```

## 8. 运行测试

```bash
# 运行测试
pnpm test

# 运行一次性测试
pnpm run test:run
```

## 目录结构

```
news_catch/
├── server/           # 服务器端代码
│   ├── api/         # API 路由
│   ├── crawler/     # 爬虫引擎
│   ├── database/    # 数据库操作
│   ├── scheduler/   # 任务调度
│   ├── sources/     # 新闻源实现
│   └── utils/       # 工具函数
├── shared/          # 共享类型和工具
├── scripts/         # 构建和初始化脚本
├── test/           # 测试文件
└── data/           # 数据存储目录
    ├── news_catch.db  # SQLite 数据库
    └── images/        # 图片存储
```

## 下一步

- 查看 [README.md](./README.md) 了解详细功能
- 查看 [API 文档](#api-接口) 了解接口使用
- 添加自定义新闻源
- 配置定时任务
- 集成 AI 分析功能