# 🤖 AI 技术新闻爬虫使用指南

## 📋 概述

AI 技术新闻爬虫是一个专门用于抓取最新 AI 技术相关新闻的工具，它从多个权威科技媒体获取真实、最新的新闻内容。

## ✨ 核心特性

- **真实新闻源** - 使用真实的新闻网站，不是模拟数据
- **最新资讯** - 抓取当前最新发布的新闻
- **AI 专业内容** - 专门过滤 AI 技术相关的新闻
- **权威媒体** - 选择了业内知名的科技媒体
- **智能去重** - 自动去除重复内容
- **自动停止** - 达到设定数量后自动停止

## 📰 新闻源列表

1. **36氪** - 创业和科技资讯的权威平台
2. **IT之家** - 专业的科技新闻网站  
3. **掘金** - 技术社区的热门文章
4. **Solidot** - 开源技术新闻
5. **少数派** - 科技生活和效率工具

## 🔍 AI 关键词过滤

系统会自动识别包含以下关键词的新闻：

### 核心 AI 关键词
- AI、人工智能、机器学习、深度学习
- ChatGPT、GPT、OpenAI、大模型、LLM
- 神经网络、算法、TensorFlow、PyTorch
- 自动驾驶、计算机视觉、NLP、自然语言
- Transformer、BERT、语言模型

### 技术公司和产品
- Claude、Gemini、Llama、文心、通义
- 智谱、百川、讯飞、NVIDIA、AMD

### 相关技术领域
- 科技、技术、创新、研发、算力、芯片
- 云计算、边缘计算、量子、区块链
- 元宇宙、VR、AR、XR

## 🚀 使用方法

### 方式一：快速测试（推荐）
```bash
# 直接测试 AI 爬虫功能
npx tsx test-ai-crawler.js
```

### 方式二：使用批处理文件
```bash
# Windows 用户
run-ai-news.bat
```

### 方式三：完整服务器模式
```bash
# 启动完整的新闻抓取服务器
npx tsx server/simple-server.ts

# 在另一个终端中启动 AI 新闻爬虫
node ai-news-test.js
```

### 方式四：手动 API 调用
```bash
# 启动服务器
npx tsx server/simple-server.ts

# 启动 AI 新闻爬虫
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "type": "ai"}'

# 查看状态
curl "http://localhost:3000/api/crawl?action=status&type=ai"

# 停止爬虫
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"action": "stop", "type": "ai"}'
```

## 📊 预期结果

运行成功后，你将获得：

- ✅ **最新新闻** - 获取当天或最近几天的新闻
- ✅ **AI 专业内容** - 只抓取 AI 技术相关的新闻
- ✅ **可访问链接** - 所有 URL 都是真实可访问的
- ✅ **完整内容** - 包含标题、摘要、发布时间等
- ✅ **自动停止** - 达到 10 篇后自动停止服务

### 示例输出
```
📚 总共抓取: 10 篇 AI 技术新闻

📊 新闻来源统计:
   - 36kr: 3 篇
   - ithome: 3 篇
   - juejin: 2 篇
   - solidot: 2 篇

📄 AI 新闻列表:
   1. [ithome] 商汤发布"悟能"具身智能平台
   2. [ithome] 基于通义千问 Qwen3 研发，蚂蚁数科发布金融推理大模型
   3. [juejin] 大模型如何突破"认知茧房"？RAG+MCP构建外部脑接口
   ...

🔗 新闻链接:
   1. https://www.ithome.com/0/871/226.htm
   2. https://www.ithome.com/0/871/217.htm
   ...
```

## 📁 数据存储

抓取的新闻数据保存在：
- **文件位置**: `./data/articles.json`
- **格式**: JSON 数组
- **字段**: id, title, content, summary, url, publishTime, source, hash, images, tags

## ⚙️ 配置选项

### 修改抓取数量限制
编辑 `server/crawler/ai-tech-news.ts` 文件：
```typescript
const MAX_ARTICLES = 10 // 修改这个数字
```

### 修改关键词过滤
在 `isAIRelated()` 函数中添加或删除关键词：
```typescript
const aiKeywords = [
  'AI', 'ai', '人工智能', // 添加你的关键词
  // ...
]
```

## 🔧 故障排除

### 常见问题

1. **网络连接问题**
   - 确保网络连接正常
   - 某些网站可能需要代理访问

2. **依赖包问题**
   ```bash
   npm install
   # 或
   pnpm install
   ```

3. **TypeScript 运行问题**
   ```bash
   npm install -g tsx
   ```

4. **端口占用问题**
   - 默认端口 3000，如被占用会自动选择其他端口

### 调试模式
设置环境变量启用详细日志：
```bash
NODE_ENV=development npx tsx test-ai-crawler.js
```

## 📈 性能优化

- 每个新闻源之间有 2 秒延迟，避免过于频繁的请求
- 每篇文章保存后有 1 秒延迟
- 自动重试机制，网络失败时会重试
- 智能去重，避免保存重复内容

## 🔒 使用注意事项

1. **遵守网站条款** - 请遵守各新闻网站的使用条款
2. **合理使用频率** - 不要过于频繁地运行爬虫
3. **数据用途** - 仅用于个人学习和研究目的
4. **网络礼仪** - 爬虫已设置合理的延迟时间

## 🆕 最新测试结果

最近一次测试成功抓取了 10 篇 AI 技术新闻：

- **茅台旗下基金、中信证券投资等入股乐聚机器人公司** (36氪)
- **商汤发布"悟能"具身智能平台** (IT之家)
- **基于通义千问 Qwen3 研发，蚂蚁数科发布金融推理大模型** (IT之家)
- **大模型如何突破"认知茧房"？RAG+MCP构建外部脑接口** (掘金)
- **NVIDIA 创业企业展示活动** (Solidot)
- 等等...

所有新闻都是真实、最新的 AI 技术相关内容，可以直接访问查看详细信息。

---

🎊 **开始使用吧！运行 `npx tsx test-ai-crawler.js` 来获取最新的 AI 技术新闻！**