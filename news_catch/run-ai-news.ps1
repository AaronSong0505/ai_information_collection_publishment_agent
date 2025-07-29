Write-Host "🤖 AI 技术新闻抓取测试" -ForegroundColor Green
Write-Host "📊 目标: 抓取 10 篇最新 AI 技术新闻后自动停止服务" -ForegroundColor Yellow
Write-Host "🎯 新闻源: 36氪、IT之家、掘金、Solidot、少数派" -ForegroundColor Cyan
Write-Host "🔍 专注: AI、人工智能、机器学习、大模型等技术资讯" -ForegroundColor Magenta
Write-Host ""

npx tsx test-ai-crawler.js

Write-Host ""
Write-Host "按任意键继续..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")