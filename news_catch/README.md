# News Catch

基于 NewsNow 的新闻抓取系统，专注于实时新闻抓取、本地存储和 AI 分析准备。

## 🤖 AI 技术新闻爬虫 (最新功能)

**专门抓取最新 AI 技术相关新闻的智能爬虫！**

### 快速使用
```bash
# 一键获取最新 AI 技术新闻
npx tsx test-ai-crawler.js

# 交互式启动器
node start-ai-news.js
```

### 特色功能
- ✅ **真实新闻源** - 从 36氪、IT之家、掘金、Solidot、少数派获取真实新闻
- ✅ **AI 专业内容** - 智能过滤 AI 技术相关新闻
- ✅ **最新资讯** - 获取当天最新发布的新闻
- ✅ **可访问链接** - 所有 URL 都可以直接访问

📚 **详细文档**: [docs/AI_NEWS_GUIDE.md](./docs/AI_NEWS_GUIDE.md)

## 特性

- 🚀 基于 NewsNow 架构的高性能新闻抓取
- 📰 支持多种新闻源类型（RSS、HTML、API）
- 💾 本地 SQLite 数据库存储
- 🖼️ 自动图片下载和存储
- ⚡ 智能缓存和去重机制
- 🔄 可配置的定时抓取任务
- 🔍 全文搜索和过滤功能
- 📊 抓取状态监控和日志

## 📚 完整文档

所有文档已整理到 [docs/](./docs/) 文件夹中：

- **[docs/README.md](./docs/README.md)** - 📚 文档中心索引
- **[docs/AI_NEWS_GUIDE.md](./docs/AI_NEWS_GUIDE.md)** - 🤖 AI 新闻爬虫使用指南
- **[docs/START_HERE.md](./docs/START_HERE.md)** - 🚀 项目入门指南
- **[docs/QUICKSTART.md](./docs/QUICKSTART.md)** - ⚡ 快速启动指南
- **[docs/WINDOWS_QUICKSTART.md](./docs/WINDOWS_QUICKSTART.md)** - 💻 Windows 用户指南

## 快速开始

### 安装依赖

```bash
cd news_catch
pnpm install
```

### 配置环境

```bash
cp .env.example .env.server
```

编辑 `.env.server` 文件配置数据库路径和其他设置。

### 初始化数据源

```bash
pnpm run presource
```

### 启动开发服务器

```bash
pnpm run dev
```

### 启动生产服务器

```bash
pnpm run build
pnpm start
```

## API 接口

### 新闻源管理

- `GET /api/sources` - 获取所有新闻源
- `POST /api/sources` - 添加新闻源
- `PUT /api/sources?id=<id>` - 更新新闻源
- `DELETE /api/sources?id=<id>` - 删除新闻源

### 文章管理

- `GET /api/articles` - 搜索文章
- `GET /api/articles?id=<id>` - 获取单篇文章
- `DELETE /api/articles?id=<id>` - 删除文章

### 爬虫控制

- `GET /api/crawl?action=status` - 获取爬虫状态
- `POST /api/crawl` - 控制爬虫（启动/停止/手动抓取）

## 添加新闻源

### RSS 源

```json
{
  "name": "示例 RSS",
  "type": "rss",
  "url": "https://example.com/rss.xml",
  "interval": 300,
  "enabled": true,
  "config": {}
}
```

### HTML 源

```json
{
  "name": "示例网站",
  "type": "html", 
  "url": "https://example.com/news",
  "interval": 600,
  "enabled": true,
  "config": {
    "selectors": {
      "title": ".news-title",
      "link": ".news-link",
      "content": ".news-content",
      "date": ".news-date",
      "image": ".news-image img"
    }
  }
}
```

### API 源

```json
{
  "name": "示例 API",
  "type": "api",
  "url": "https://api.example.com/news",
  "interval": 300,
  "enabled": true,
  "config": {
    "headers": {
      "Authorization": "Bearer token"
    }
  }
}
```

## 数据存储

### 文章数据

- 标题、内容、摘要
- 发布时间、抓取时间
- 作者、来源信息
- 图片和标签
- 去重哈希值

### 图片存储

- 自动下载新闻配图
- 本地文件系统存储
- 图片元数据记录
- 支持多种格式

### 缓存机制

- 30分钟默认缓存
- 智能缓存失效
- 减少重复抓取
- 提高响应速度

## 监控和日志

### 抓取状态

- 实时任务状态
- 成功/失败统计
- 错误信息记录
- 性能指标监控

### 日志系统

- 结构化日志输出
- 多级别日志记录
- 错误追踪和调试
- 运行状态监控

## 扩展开发

### 添加新的解析器

在 `server/crawler/parser.ts` 中扩展 `ContentParser` 类。

### 自定义新闻源

在 `server/sources/` 目录下添加新的源文件。

### 数据处理插件

实现 `ParserPlugin` 接口来添加自定义处理逻辑。

## 部署

### Docker 部署

```bash
docker build -t news-catch .
docker run -p 3000:3000 -v ./data:/app/data news-catch
```

### 系统服务

使用 PM2 或 systemd 部署为系统服务。

## 许可证

基于 NewsNow 项目的 MIT 许可证开发。

## 贡献

欢迎提交 Issue 和 Pull Request！