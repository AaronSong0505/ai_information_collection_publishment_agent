# 🚀 News Catch - 立即开始

## 一键启动 (Windows)

```cmd
# 进入项目目录
cd D:\tools_work\self-project-dev\ai_agent\news_catch

# 1. 初始化项目
news-catch.bat init

# 2. 验证设置
news-catch.bat verify

# 3. 初始化数据库
news-catch.bat init-db

# 4. 启动服务
news-catch.bat start
```

## 验证运行

```cmd
# 查看服务状态
news-catch.bat status

# 测试 API
curl http://localhost:3000/health
curl http://localhost:3000/api/sources

# 运行演示
news-catch.bat demo
```

## 🎯 就这么简单！

服务启动后，你的新闻抓取系统就开始工作了：

- **Web 界面**: http://localhost:3000
- **健康检查**: http://localhost:3000/health  
- **API 文档**: 查看 [README.md](./README.md)
- **详细指南**: 查看 [WINDOWS_QUICKSTART.md](./WINDOWS_QUICKSTART.md)

## 🛠️ 常用命令

```cmd
news-catch.bat start     # 启动服务
news-catch.bat stop      # 停止服务  
news-catch.bat status    # 查看状态
news-catch.bat logs      # 查看日志
news-catch.bat demo      # 运行演示
news-catch.bat help      # 查看帮助
```

## 📊 默认新闻源

系统已预配置以下新闻源：
- BBC News (RSS)
- TechCrunch (RSS)  
- Hacker News (HTML)
- GitHub Trending (HTML)

## 🔧 自定义配置

编辑 `.env.server` 文件调整配置：
- 数据库路径
- 服务端口
- 爬虫设置
- 缓存配置

## 📞 需要帮助？

- 查看日志: `news-catch.bat logs`
- 运行测试: `news-catch.bat test`
- 重置数据: `news-catch.bat clean`
- 完整文档: [README.md](./README.md)

---

**🎉 恭喜！你的新闻抓取系统已经准备就绪！**