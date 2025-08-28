# 社交媒体 AI 新闻抓取扩展指南

## 🎯 功能概述

本扩展为 AI 新闻抓取系统增加了社交媒体平台支持，能够从 Reddit、YouTube、GitHub、Medium、LinkedIn 等平台抓取高质量的 AI 相关内容。

## 🚀 快速开始

### 1. 运行社交媒体演示
```bash
# 运行社交媒体 AI 新闻抓取演示
npm run demo-social

# 查看社交媒体源配置
npm run social-config list

# 启动社交媒体爬虫
npm run social-crawl
```

### 2. 配置管理
```bash
# 启用/禁用特定平台
npm run social-config enable reddit-ai
npm run social-config disable linkedin-ai-posts

# 设置平台互动权重
npm run social-config engagement reddit 0.5
npm run social-config engagement youtube 0.3

# 添加优选用户/频道
npm run social-config add-influencer youtube "Two Minute Papers"
npm run social-config add-influencer reddit "artificial"

# 查看平台统计
npm run social-config stats
```

## 📱 支持的平台

### ✅ 已实现平台

| 平台 | 状态 | 特色功能 | 筛选指标 |
|------|------|----------|----------|
| **Reddit** | ✅ 支持 | 基于 upvotes 和评论数筛选 | 赞数、评论数 |
| **YouTube** | ✅ 支持 | 支持频道订阅和观看量筛选 | 观看量、点赞数 |
| **GitHub** | ✅ 支持 | 基于 stars 和 forks 筛选 | Star数、Fork数 |
| **Medium** | ✅ 支持 | 支持拍手数和阅读时间筛选 | 拍手数、作者声誉 |
| **LinkedIn** | ⚠️ 有限支持 | 需要处理登录限制 | 点赞数、分享数 |

### 🔄 计划中的平台

| 平台 | 难度 | 实现方案 | 预期功能 |
|------|------|----------|----------|
| **Twitter/X** | 🔴 困难 | 官方API (付费) | 转推数、点赞数筛选 |
| **Instagram** | 🟡 中等 | 图片内容为主 | 点赞数、评论数 |
| **TikTok** | 🔴 困难 | 反爬严格 | 观看量、分享数 |
| **Discord** | 🟡 中等 | Bot API | 服务器活跃度 |
| **Telegram** | 🟢 简单 | 公开频道 | 订阅数、转发数 |

## ⚙️ 配置说明

### 新闻源配置结构
```json
{
  "id": "reddit-ai",
  "name": "Reddit - AI 讨论",
  "platform": "reddit",
  "socialMediaConfig": {
    "platform": "reddit",
    "minUpvotes": 50,        // 最小赞数
    "minComments": 10,       // 最小评论数
    "engagementWeight": 0.3, // 互动权重
    "preferredChannels": ["artificial", "MachineLearning"]
  }
}
```

### 平台特定配置

#### Reddit 配置
```json
{
  "minUpvotes": 50,
  "minComments": 10,
  "engagementWeight": 0.3,
  "preferredSubreddits": [
    "artificial",
    "MachineLearning", 
    "OpenAI",
    "ChatGPT"
  ]
}
```

#### YouTube 配置
```json
{
  "minViews": 1000,
  "minLikes": 50,
  "engagementWeight": 0.2,
  "preferredChannels": [
    "Two Minute Papers",
    "Lex Fridman",
    "AI Explained"
  ]
}
```

#### GitHub 配置
```json
{
  "minStars": 100,
  "minForks": 10,
  "engagementWeight": 0.4,
  "preferredLanguages": ["Python", "JavaScript"]
}
```

## 🎯 智能筛选机制

### 1. 互动数据筛选
- **Reddit**: 基于 upvotes 和评论数
- **YouTube**: 基于观看量和点赞比
- **GitHub**: 基于 stars 和 forks 数
- **Medium**: 基于拍手数和阅读量

### 2. 内容质量评估
```typescript
// 综合评分算法
score = (upvotes * 1.0) + (comments * 0.5) + (views * 0.001)

// 平台权重
finalScore = score * engagementWeight
```

### 3. AI 相关性检测
- 关键词匹配：AI, LLM, transformer, neural network 等
- 内容语义分析
- 用户标签和社区分类

## 🛠️ 高级功能

### 1. 影响力用户优先级
```bash
# 添加高影响力用户
npm run social-config add-influencer youtube "Yannic Kilcher"
npm run social-config add-influencer reddit "artificial"
```

### 2. 实时热度监控
- 监控话题趋势变化
- 检测病毒式传播内容
- 追踪突发AI新闻

### 3. 反爬虫策略
- 动态 User-Agent 轮换
- 请求频率控制
- 代理服务器支持
- Cookie 管理

## 📊 数据格式

### 社交媒体文章格式
```json
{
  "title": "文章标题",
  "content": "文章内容",
  "url": "原始链接", 
  "author": "作者名称",
  "platform": "reddit",
  "engagement": {
    "upvotes": 150,
    "comments": 25,
    "score": 162.5
  },
  "publishTime": "2024-01-15T10:30:00Z",
  "tags": ["AI", "社交", "讨论"]
}
```

## 🚫 法律和道德考虑

### 1. 平台政策遵守
- 严格遵守各平台的 robots.txt
- 尊重 API 使用条款
- 不进行恶意爬取

### 2. 频率限制
- Reddit: 每30秒最多1个请求
- YouTube: 需要API密钥，有配额限制
- GitHub: 每小时5000次请求限制
- LinkedIn: 需要特殊处理，建议手动筛选

### 3. 数据使用规范
- 仅用于个人研究和学习
- 不得用于商业用途
- 尊重原作者版权

## 🔧 故障排除

### 常见问题

#### 1. 抓取失败
```bash
# 检查网络连接
ping reddit.com

# 检查配置文件
npm run social-config stats

# 启用详细日志
DEBUG=* npm run demo-social
```

#### 2. 反爬虫限制
- 使用代理服务器
- 增加请求延迟
- 更换 User-Agent
- 考虑使用官方API

#### 3. 内容质量问题
- 调整关键词匹配规则
- 提高互动数据阈值
- 增加人工审核环节

## 🌟 最佳实践

### 1. 配置优化
```bash
# 根据需求调整筛选条件
npm run social-config engagement reddit 0.8  # 提高Reddit权重
npm run social-config engagement youtube 0.2  # 降低YouTube权重
```

### 2. 定期维护
- 每周检查配置有效性
- 更新优选用户/频道列表
- 清理无效或过期的链接

### 3. 性能监控
- 监控抓取成功率
- 跟踪内容质量变化
- 分析平台流量分布

## 🔮 未来路线图

### 短期目标 (1-2个月)
- [ ] 增加 Twitter/X API 支持
- [ ] 完善 LinkedIn 登录处理
- [ ] 添加 Telegram 频道支持
- [ ] 优化反爬虫策略

### 中期目标 (3-6个月)
- [ ] 实现实时流数据处理
- [ ] 添加情感分析功能
- [ ] 支持多语言内容
- [ ] 构建影响力评估系统

### 长期目标 (6-12个月)
- [ ] AI 驱动的内容推荐
- [ ] 社交网络分析
- [ ] 趋势预测功能
- [ ] 企业级API服务

## 📞 支持和反馈

如果你在使用过程中遇到问题或有改进建议，请：

1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 提交详细的问题报告
4. 贡献代码改进

---

**注意**: 社交媒体平台的政策和技术都在不断变化，请定期更新配置和代码以确保正常运行。