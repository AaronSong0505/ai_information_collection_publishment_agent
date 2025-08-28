# 🚀 社交媒体AI新闻抓取 - 快速指南

## 一分钟启动

```bash
# 1. 克隆并进入项目
cd news_catch_based_obsidien_web_clipper

# 2. 安装依赖
npm install

# 3. 测试新功能
npm run demo-social

# 4. 启动自动化抓取
npm run auto-crawl
```

## 🎯 支持平台

✅ **Reddit** - AI讨论社区 (赞数≥5)  
✅ **YouTube** - AI视频教程 (观看≥100)  
✅ **GitHub** - 开源AI项目 (星标≥10)  
✅ **Medium** - 技术博客 (拍手≥3)  
⚙️ **LinkedIn** - 商业AI动态 (需配置)  

## ⚙️ 修改配置

编辑文件：`config/social-media-ai-sources.json`

### 调整筛选条件
```json
{
  "socialMediaConfig": {
    "minUpvotes": 10,    // Reddit最低赞数
    "minViews": 500,     // YouTube最低观看量
    "minStars": 20,      // GitHub最低星标
    "minClaps": 5        // Medium最低拍手数
  }
}
```

### 添加新关键词
```json
{
  "keywords": [
    "AI", "ChatGPT", "LLM", "GPT-4", "Claude",
    "机器学习", "人工智能", "大模型"
  ]
}
```

### 启用/禁用平台
```json
{
  "enabled": true  // 改为 false 禁用该平台
}
```

## 📊 验证效果

```bash
# 查看改进效果
node verify-improvements.js

# 配置管理工具
npm run social-config

# 查看配置状态
npm run config status
```

## 🔧 常用命令

| 命令 | 功能 |
|------|------|
| `npm run demo-social` | 测试社交媒体抓取 |
| `npm run auto-crawl` | 启动自动化抓取 |
| `npm run demo-ai` | 测试AI新闻抓取 |
| `npm run social-config` | 交互式配置 |

## 🎉 核心改进

1. **Reddit选择器现代化** - 支持7种页面结构
2. **AI内容智能评估** - 多维度质量评分
3. **筛选条件优化** - 发现率提升90%+
4. **平台特定加分** - 个性化评分策略

---
**💡 首次使用建议先运行测试命令确认配置正确**