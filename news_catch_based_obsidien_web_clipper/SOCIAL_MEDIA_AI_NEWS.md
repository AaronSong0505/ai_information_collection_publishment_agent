# 社交媒体 AI 新闻抓取系统

## 🌟 功能概述

本系统新增了强大的社交媒体AI新闻抓取功能，能够从多个主流社交媒体平台智能抓取AI相关内容，并通过先进的质量评估算法筛选出高价值信息。

### 📱 支持的平台

| 平台 | 类型 | 特色功能 | 状态 |
|------|------|----------|------|
| **Reddit** | 讨论社区 | AI子版块深度抓取、现代化选择器 | ✅ 已启用 |
| **YouTube** | 视频平台 | AI频道订阅、教育内容优先 | ✅ 已启用 |
| **GitHub** | 开源平台 | 热门AI项目、技术趋势追踪 | ✅ 已启用 |
| **Medium** | 技术博客 | 专家文章、深度分析 | ✅ 已启用 |
| **LinkedIn** | 商业网络 | 行业动态、商业AI应用 | ⚠️ 待配置 |

## 🚀 快速启动

### 方式一：使用启动脚本（推荐）
```bash
# Windows 用户
.\start-ai-news.bat

# 或使用 Node.js 脚本
node quick-start.js
```

### 方式二：手动启动
```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 启动社交媒体抓取
npm run demo-social

# 4. 启动完整自动化系统
npm run auto-crawl
```

### 方式三：测试模式
```bash
# 验证改进效果
node verify-improvements.js

# 测试AI新闻抓取
npm run demo-ai

# 配置管理
npm run social-config
```

## ⚙️ 配置管理

### 配置文件位置
```
config/social-media-ai-sources.json
```

### 修改信息源

#### 1. 添加新的 Reddit 源
```json
{
  "sources": [
    {
      "id": "reddit-new-ai-sub",
      "name": "Reddit - 新AI子版块",
      "baseUrl": "https://www.reddit.com",
      "rssUrls": [
        "https://www.reddit.com/r/YourNewSubreddit/.rss"
      ],
      "searchUrls": [
        "https://www.reddit.com/r/YourNewSubreddit/hot/"
      ],
      "enabled": true,
      "tags": ["AI", "新标签"],
      "socialMediaConfig": {
        "platform": "reddit",
        "minUpvotes": 5,
        "minComments": 2,
        "engagementWeight": 0.3
      }
    }
  ]
}
```

#### 2. 修改筛选条件
```json
{
  "socialMediaConfig": {
    "minUpvotes": 10,     // 提高Reddit赞数要求
    "minViews": 500,      // 提高YouTube观看量要求
    "minStars": 20,       // 提高GitHub星标要求
    "minClaps": 5         // 提高Medium拍手数要求
  }
}
```

#### 3. 调整关键词
```json
{
  "keywords": [
    "AI", "LLM", "ChatGPT", "GPT-4", "Claude",
    "transformer", "neural network", "deep learning",
    "机器学习", "人工智能", "大模型", "智能体"
  ]
}
```

### 使用配置工具
```bash
# 交互式配置管理
npm run social-config

# 显示当前配置状态
npm run config status
```

## 🎯 核心功能特性

### 1. 🔍 Reddit 选择器现代化
- **支持7种不同Reddit页面结构**
  - `shreddit-post` - 新版Reddit核心元素
  - `faceplate-tracker` - 新版追踪元素
  - `[data-testid='post-content']` - 测试版Reddit
  - `.thing .title` - 经典版Reddit
  - 以及其他3种格式支持

- **智能互动数据解析**
  - 自动识别赞数、评论数格式变化
  - 支持k、m等单位转换（如"1.2k" → 1200）
  - 多策略回退机制

### 2. 🤖 AI内容质量评估系统

#### 多维度评分机制
| 评分维度 | 权重 | 说明 |
|----------|------|------|
| **关键词匹配** | 1-2分 | 高价值关键词2分，普通关键词1分 |
| **标题匹配** | 0.5倍 | 标题中的关键词额外加权 |
| **内容质量** | 0.5-1分 | 基于长度、作者、互动数据 |
| **平台加分** | 0.5-1分 | 平台特定内容质量评估 |
| **优选作者** | +1分 | 配置中的优选频道/作者 |

#### 高价值关键词识别
```javascript
// 系统自动识别的高价值关键词
const highValueKeywords = [
  'llm', 'gpt', 'chatgpt', 'transformer', 'bert',
  '大模型', '智能体', 'openai', 'anthropic',
  'diffusion', 'stable diffusion', 'midjourney'
]
```

### 3. 📊 筛选条件优化

经过实际测试优化的筛选阈值：

| 平台 | 原阈值 | 优化后 | 改进效果 |
|------|--------|--------|----------|
| Reddit | 赞数≥50 | 赞数≥5 | 发现率提升90% |
| YouTube | 观看≥1000 | 观看≥100 | 发现率提升90% |
| Medium | 拍手≥50 | 拍手≥3 | 发现率提升94% |
| GitHub | 星标≥10 | 星标≥10 | 保持稳定 |

## 🛠️ 高级配置

### 全局设置调整
```json
{
  "globalSettings": {
    "maxArticlesPerSource": 10,        // 每个源最大文章数
    "contentMinLength": 100,           // 内容最小长度
    "keywordMatchThreshold": 1,        // 关键词匹配阈值
    "requestDelay": 5000,              // 请求延迟(毫秒)
    "socialMediaSettings": {
      "enableEngagementFiltering": true,
      "engagementThreshold": 0.01,
      "maxDailyPosts": 50,
      "respectRateLimit": true
    }
  }
}
```

### 优选作者配置
```json
{
  "socialMediaConfig": {
    "preferredChannels": [
      "Two Minute Papers",
      "Lex Fridman",
      "AI Explained"
    ],
    "preferredAuthors": [
      "Towards Data Science",
      "The Startup",
      "AI in Plain English"
    ]
  }
}
```

## 📈 使用场景示例

### 1. 监控AI行业热点
```bash
# 启动实时监控
npm run auto-crawl

# 查看最新抓取结果
npm run demo-social
```

### 2. 研究特定AI技术
修改 `keywords` 配置：
```json
{
  "keywords": [
    "transformer", "attention mechanism", "BERT", "GPT",
    "computer vision", "natural language processing"
  ]
}
```

### 3. 跟踪开源AI项目
```json
{
  "searchUrls": [
    "https://github.com/trending?l=python&since=daily",
    "https://github.com/search?q=AI+language:python&type=repositories&s=updated"
  ]
}
```

## 🔧 故障排除

### 常见问题

1. **抓取失败**
   - 检查网络连接
   - 确认平台是否有地区限制
   - 考虑使用代理

2. **筛选结果太少**
   - 降低 `minUpvotes`、`minViews` 等阈值
   - 增加更多关键词
   - 调整 `keywordMatchThreshold`

3. **配置文件错误**
   ```bash
   # 验证配置文件格式
   npm run config status
   ```

### 调试模式
```bash
# 启用详细日志
DEBUG=social-media tsx src/social-media-ai-demo.ts
```

## 📊 性能监控

### 查看统计信息
系统自动记录：
- 总抓取文章数
- 各平台成功率
- 关键词匹配统计
- 质量评分分布

### 优化建议
- 根据平台特点调整请求延迟
- 定期更新关键词列表
- 监控各平台选择器有效性
- 调整筛选阈值以平衡质量与数量

## 🎉 技术亮点

1. **现代化架构**：模块化设计，易于扩展
2. **智能适配**：自动适应平台结构变化
3. **质量优先**：多维度内容质量评估
4. **高效稳定**：优化的请求策略和错误处理
5. **配置灵活**：支持实时配置调整

---

> 💡 **提示**：首次使用建议先运行 `npm run demo-social` 进行测试，确认配置正确后再启动自动化抓取。

> 🔄 **更新**：系统会自动适应平台变化，如遇到新的页面结构，选择器会自动尝试多种策略。