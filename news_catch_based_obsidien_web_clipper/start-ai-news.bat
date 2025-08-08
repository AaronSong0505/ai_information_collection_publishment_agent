@echo off
chcp 65001 >nul
echo 🤖 AI 新闻自动抓取系统
echo ========================
echo.

echo 📋 当前配置状态:
npm run config status
echo.

echo 🚀 启动自动化 AI 新闻爬虫...
echo 💡 提示: 修改 config/ai-news-sources.json 可实时调整配置
echo 💡 按 Ctrl+C 停止爬虫
echo.

npm run auto-crawl