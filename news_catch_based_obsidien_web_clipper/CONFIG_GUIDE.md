# AI 新闻源配置指南

## 🎯 快速开始

### 1. 查看当前配置
```bash
npm run config list
```

### 2. 启用/禁用新闻源
```bash
# 启用 36氪 AI 频道
npm run config enable 36kr-ai

# 禁用 IT之家 AI 新闻
npm run config disable ithome-ai

# 切换掘金 AI 技术状态
npm run config toggle juejin-ai
```

### 3. 启动自动化爬虫
```bash
# Windows
start-ai-news.bat

# 或直接运行
npm run auto-crawl
```

## 📋 可用的新闻源 ID

| ID | 名称 | 默认状态 | 描述 |
|---|------|---------|------|
| `36kr-ai` | 36氪 AI 频道 | ✅ 启用 | 创业和 AI 科技资讯 |
| `ithome-ai` | IT之家 AI 新闻 | ✅ 启用 | 专业的 AI 科技新闻 |
| `juejin-ai` | 掘金 AI 技术 | ✅ 启用 | AI 技术社区文章 |
| `solidot-ai` | Solidot AI 科技 | ✅ 启用 | 开源 AI 技术新闻 |
| `sspai-ai` | 少数派 AI 效率 | ✅ 启用 | AI 效率工具和应用 |
| `techcrunch-ai` | TechCrunch AI | ❌ 禁用 | 国际 AI 创业资讯 |
| `arxiv-ai` | arXiv AI 论文 | ❌ 禁用 | 学术 AI 论文 |
| `aibase-news` | AIBase 资讯 | ❌ 禁用 | AI 工具和应用资讯 |

## ⚙️ 配置文件说明

配置文件位置: `config/ai-news-sources.json`

### 新闻源配置结构
```json
{
  "id": "36kr-ai",                    // 唯一标识符
  "name": "36氪 - AI 频道",           // 显示名称
  "baseUrl": "https://36kr.com",      // 基础URL
  "searchUrls": [                     // 搜索页面URL列表
    "https://36kr.com/search/articles/人工智能",
    "https://36kr.com/search/articles/AI"
  ],
  "enabled": true,                    // 是否启用
  "tags": ["AI", "创业", "科技"],     // 标签
  "selectors": {                      // CSS选择器
    "articleLinks": ".article-item-title a",
    "title": "h1, .article-title",
    "content": ".article-content",
    "publishTime": ".time"
  },
  "keywords": [                       // 关键词过滤
    "人工智能", "AI", "机器学习"
  ],
  "interval": 30                      // 抓取间隔(分钟)
}
```

### 全局设置
```json
{
  "globalSettings": {
    "maxArticlesPerSource": 10,       // 每个源最大文章数
    "contentMinLength": 100,          // 内容最小长度
    "enableKeywordFiltering": true,   // 启用关键词过滤
    "keywordMatchThreshold": 1,       // 关键词匹配阈值
    "excludeKeywords": ["广告", "推广"], // 排除关键词
    "requestDelay": 2000,             // 请求延迟(毫秒)
    "timeout": 30000                  // 请求超时(毫秒)
  }
}
```

## 🔧 自定义配置

### 1. 修改现有新闻源
直接编辑 `config/ai-news-sources.json` 文件:

```json
{
  "id": "36kr-ai",
  "enabled": false,           // 改为 false 禁用
  "keywords": [               // 添加更多关键词
    "人工智能", "AI", "机器学习", "ChatGPT", "大模型"
  ],
  "interval": 15              // 改为 15 分钟抓取一次
}
```

### 2. 添加新的搜索URL
```json
{
  "searchUrls": [
    "https://36kr.com/search/articles/人工智能",
    "https://36kr.com/search/articles/AI",
    "https://36kr.com/search/articles/ChatGPT",    // 新增
    "https://36kr.com/search/articles/大模型"      // 新增
  ]
}
```

### 3. 调整全局设置
```json
{
  "globalSettings": {
    "maxArticlesPerSource": 20,       // 增加每源文章数
    "enableKeywordFiltering": false,  // 禁用关键词过滤
    "requestDelay": 1000             // 减少延迟时间
  }
}
```

## 🚀 实时配置更新

系统支持**热重载配置**，无需重启：

1. **修改配置文件** - 编辑 `config/ai-news-sources.json`
2. **保存文件** - 系统自动检测变化
3. **立即生效** - 配置变化立即应用

### 监控日志
当你修改配置时，会看到类似日志：
```
🔄 配置文件已重载
✅ 启用 新闻源: 36氪 - AI 频道
📊 每源最大文章数: 10 → 20
```

## 💡 使用技巧

### 1. 快速启用国际源
```bash
npm run config enable techcrunch-ai
npm run config enable arxiv-ai
```

### 2. 只启用特定类型的源
```bash
# 禁用所有源
npm run config disable 36kr-ai
npm run config disable ithome-ai
npm run config disable juejin-ai
npm run config disable solidot-ai
npm run config disable sspai-ai

# 只启用学术源
npm run config enable arxiv-ai
```

### 3. 查看实时状态
```bash
npm run config status
```

## 🔍 故障排除

### 1. 配置文件格式错误
如果修改配置后出现错误，检查 JSON 格式是否正确：
- 确保所有字符串用双引号
- 确保对象和数组的逗号正确
- 使用 JSON 验证工具检查格式

### 2. 新闻源无法访问
如果某个新闻源无法访问：
- 检查网络连接
- 确认 URL 是否正确
- 临时禁用该源: `npm run config disable <source-id>`

### 3. 关键词过滤太严格
如果抓取的文章太少：
- 减少 `keywordMatchThreshold` 值
- 添加更多相关关键词
- 或者禁用关键词过滤: `"enableKeywordFiltering": false`

## 📊 监控和统计

### 查看抓取统计
```bash
npm run config status
```

### 查看详细信息
```bash
npm run manage-sources
```

这样你就可以完全通过修改 `config/ai-news-sources.json` 文件来控制所有新闻源的启用/禁用状态，系统会自动检测变化并应用新配置！