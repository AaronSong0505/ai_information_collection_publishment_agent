# 📁 项目结构说明

## 🗂️ 目录结构

```
news_catch/
├── docs/                           # 📚 文档中心
│   ├── README.md                   # 文档索引
│   ├── AI_NEWS_GUIDE.md           # AI 新闻爬虫指南
│   ├── AI_NEWS_COMPLETE.md        # AI 爬虫完成报告
│   ├── START_HERE.md              # 项目入门
│   ├── QUICKSTART.md              # 快速启动
│   ├── WINDOWS_QUICKSTART.md      # Windows 指南
│   ├── PROJECT_SUMMARY.md         # 项目总结
│   └── FINAL_SETUP.md             # 配置说明
│
├── server/                         # 🖥️ 服务器端代码
│   ├── crawler/                    # 爬虫模块
│   │   ├── ai-tech-news.ts        # AI 技术新闻爬虫 ⭐
│   │   ├── simple-newsnow.ts      # NewsNow 简化爬虫
│   │   ├── dev-crawler.ts         # 开发版爬虫
│   │   └── ...
│   ├── database/                   # 数据库模块
│   ├── api/                        # API 接口
│   └── utils/                      # 工具函数
│
├── data/                           # 📊 数据存储
│   └── articles.json              # 抓取的新闻数据
│
├── scripts/                        # 🔧 脚本工具
├── test/                          # 🧪 测试文件
│
├── 🤖 AI 新闻爬虫相关文件
├── test-ai-crawler.js             # 快速测试脚本 ⭐
├── ai-news-test.js                # 完整服务测试
├── start-ai-news.js               # 交互式启动器
├── run-ai-news.bat                # Windows 批处理
├── run-ai-news.ps1                # PowerShell 脚本
│
├── 📋 其他启动脚本
├── start-crawling.js              # 通用爬虫启动
├── start-newsnow-crawling.js      # NewsNow 爬虫启动
├── dev-test.js                    # 开发测试
├── dev-test-mock.js               # 模拟测试
│
└── 📄 配置文件
    ├── package.json               # 项目配置
    ├── tsconfig.json              # TypeScript 配置
    ├── README.md                  # 项目说明
    └── ...
```

## 🎯 核心文件说明

### 🤖 AI 新闻爬虫 (推荐使用)
- **`test-ai-crawler.js`** - 最简单的 AI 新闻测试脚本
- **`server/crawler/ai-tech-news.ts`** - AI 新闻爬虫核心实现
- **`start-ai-news.js`** - 交互式启动器，提供菜单选择

### 📚 文档系统
- **`docs/README.md`** - 文档中心，包含所有文档的索引
- **`docs/AI_NEWS_GUIDE.md`** - AI 新闻爬虫的详细使用指南
- **`docs/START_HERE.md`** - 新用户入门指南

### 🗄️ 数据存储
- **`data/articles.json`** - 抓取的新闻数据存储文件
- **`server/database/`** - 数据库相关代码

### 🔧 工具脚本
- **Windows 用户**: `run-ai-news.bat` 或 `run-ai-news.ps1`
- **跨平台**: `node start-ai-news.js`
- **开发者**: `npx tsx test-ai-crawler.js`

## 🚀 推荐使用流程

### 新用户
1. 阅读 `docs/README.md` 了解文档结构
2. 查看 `docs/AI_NEWS_GUIDE.md` 学习 AI 新闻爬虫
3. 运行 `npx tsx test-ai-crawler.js` 开始使用

### 开发者
1. 查看 `docs/PROJECT_SUMMARY.md` 了解技术架构
2. 阅读 `server/crawler/ai-tech-news.ts` 了解实现细节
3. 运行测试脚本验证功能

### Windows 用户
1. 双击 `run-ai-news.bat` 直接运行
2. 或使用 PowerShell 运行 `run-ai-news.ps1`

## 📊 文件重要性等级

### ⭐⭐⭐ 核心文件 (必须了解)
- `docs/README.md` - 文档入口
- `docs/AI_NEWS_GUIDE.md` - 使用指南
- `test-ai-crawler.js` - 快速测试
- `server/crawler/ai-tech-news.ts` - 核心实现

### ⭐⭐ 重要文件 (建议了解)
- `docs/START_HERE.md` - 项目入门
- `start-ai-news.js` - 交互启动器
- `data/articles.json` - 数据文件

### ⭐ 辅助文件 (可选了解)
- 其他测试脚本和配置文件
- 历史文档和工具脚本

---

*最后更新: 2025-07-28*