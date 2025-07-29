// 启动 NewsNow 爬虫脚本
console.log('🕷️ 启动 NewsNow 现成爬虫...')
console.log('📰 将使用: HackerNews, GitHub Trending, ITHome, V2EX')

async function startNewsNowCrawling() {
  try {
    // 启动 NewsNow 爬虫
    console.log('📡 发送启动 NewsNow 爬虫请求...')
    const startResponse = await fetch('http://localhost:3000/api/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'start',
        type: 'newsnow'  // 使用 NewsNow 爬虫
      })
    })
    
    if (startResponse.ok) {
      const result = await startResponse.json()
      console.log('✅ NewsNow 爬虫启动成功:', result.data.message)
      console.log('📊 限制:', result.data.note)
      console.log('🔧 可用爬虫:', result.data.availableCrawlers.join(', '))
    } else {
      console.error('❌ 启动失败:', startResponse.status)
      return
    }
    
    // 定期检查状态
    console.log('\n📊 开始监控 NewsNow 爬虫状态...')
    const checkInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch('http://localhost:3000/api/crawl?action=status&type=newsnow')
        if (statusResponse.ok) {
          const status = await statusResponse.json()
          const { articleCount, maxArticles, shouldStop, type } = status.data
          
          console.log(`📈 进度: ${articleCount}/${maxArticles} 篇文章 (${type} 爬虫)`)
          
          if (shouldStop || articleCount >= maxArticles) {
            console.log('🎉 NewsNow 爬虫已完成或停止')
            clearInterval(checkInterval)
            
            // 显示最终结果
            setTimeout(async () => {
              const articlesResponse = await fetch('http://localhost:3000/api/articles')
              if (articlesResponse.ok) {
                const articles = await articlesResponse.json()
                console.log(`\n📚 最终结果: 共抓取 ${articles.data.total} 篇文章`)
                
                // 显示文章来源统计
                const sources = {}
                articles.data.items.forEach(article => {
                  sources[article.source] = (sources[article.source] || 0) + 1
                })
                
                console.log('📊 文章来源统计:')
                Object.entries(sources).forEach(([source, count]) => {
                  console.log(`   - ${source}: ${count} 篇`)
                })
                
                console.log('\n🔍 可以通过以下方式查看:')
                console.log('   - 访问: http://localhost:3000/api/articles')
                console.log('   - 或运行: curl http://localhost:3000/api/articles')
              }
            }, 2000)
          }
        }
      } catch (error) {
        console.error('❌ 状态检查失败:', error.message)
      }
    }, 3000) // 每3秒检查一次
    
    // 60秒后自动停止监控
    setTimeout(() => {
      clearInterval(checkInterval)
      console.log('⏰ 监控超时，停止状态检查')
    }, 60000)
    
  } catch (error) {
    console.error('❌ NewsNow 爬虫启动失败:', error.message)
  }
}

startNewsNowCrawling()