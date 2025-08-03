# News Catch 教程总结

## 📋 项目概述

News Catch 是一个基于 NewsNow 的新闻抓取系统，专注于实时新闻抓取、本地存储和为 AI 分析做准备。最新功能是专门抓取 AI 技术相关新闻的智能爬虫。

## 🚀 快速开始

### 安装依赖
```bash
cd news_catch
pnpm install
```

### 快速测试 AI 爬虫
```bash
# 一键获取最新 AI 技术新闻（推荐）
npx tsx test-ai-crawler.js

# 或使用交互式启动器
node start-ai-news.js
```

## 🤖 AI 技术新闻爬虫

### 核心特性
- **真实新闻源** - 使用真实的新闻网站，不是模拟数据
- **最新资讯** - 抓取当前最新发布的新闻
- **AI 专业内容** - 专门过滤 AI 技术相关的新闻
- **权威媒体** - 包括 36氪、IT之家、掘金、Solidot、少数派等

### 新闻源列表
1. **36氪** - 创业和科技资讯
2. **IT之家** - 专业的科技新闻
3. **掘金** - 技术社区文章
4. **Solidot** - 开源技术新闻
5. **少数派** - 科技生活资讯

## 🛠 完整系统使用

### 初始化项目
```bash
# 方式一：使用批处理脚本 (Windows)
news-catch.bat init
news-catch.bat init-db
news-catch.bat start

# 方式二：手动初始化
pnpm install
cp .env.example .env.server
pnpm run init-sources
```

### 启动开发服务器
```bash
pnpm run dev
```

服务将在 http://localhost:3000 启动

### API 测试
```bash
# 查看健康状态
curl http://localhost:3000/health

# 查看所有新闻源
curl http://localhost:3000/api/sources

# 启动爬虫
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

## 📁 数据存储

- **文章数据**: `data/articles.json`
- **图片存储**: `data/images/` 目录
- **数据库**: SQLite 数据库文件

## 📚 详细文档

如需了解更多详细信息，请参考以下文档：

- [AI_NEWS_GUIDE.md](./AI_NEWS_GUIDE.md) - AI 新闻爬虫使用指南
- [WINDOWS_QUICKSTART.md](./WINDOWS_QUICKSTART.md) - Windows 用户详细指南
- [QUICKSTART.md](./QUICKSTART.md) - 通用快速启动指南