// 直接测试 AI 技术新闻爬虫
import { getAITechNewsCrawler } from './server/crawler/ai-tech-news.ts'

console.log('🤖 开始测试 AI 技术新闻爬虫...')
console.log('📊 目标: 抓取最新的 AI 技术相关新闻')
console.log('🎯 新闻源: 36氪、IT之家、掘金、少数派、机器之心、雷锋网、TechCrunch、MIT Technology Review')

async function testAICrawler() {
  try {
    const crawler = getAITechNewsCrawler()
    
    // 设置完成回调
    crawler.setOnComplete(() => {
      console.log('\n🎉 AI 新闻爬虫测试完成！')
      showResults()
    })
    
    // 开始抓取
    await crawler.startCrawling()
    
    // 显示最终状态
    const status = crawler.getStatus()
    console.log('\n📊 最终状态:')
    console.log(`   - 抓取文章数: ${status.articleCount}`)
    console.log(`   - 最大限制: ${status.maxArticles}`)
    console.log(`   - 是否停止: ${status.shouldStop}`)
    
    // 等待一下再显示结果
    setTimeout(showResults, 2000)
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

async function showResults() {
  try {
    const fs = await import('fs')
    const articlesFile = './data/articles.json'
    
    if (fs.existsSync(articlesFile)) {
      const articlesData = fs.readFileSync(articlesFile, 'utf-8')
      const articles = JSON.parse(articlesData)
      
      console.log(`\n📚 总共抓取: ${articles.length} 篇 AI 技术新闻`)
      
      if (articles.length > 0) {
        console.log('\n📊 新闻来源统计:')
        const sources = {}
        articles.forEach(article => {
          sources[article.source] = (sources[article.source] || 0) + 1
        })
        
        Object.entries(sources).forEach(([source, count]) => {
          console.log(`   - ${source}: ${count} 篇`)
        })
        
        console.log('\n📄 AI 新闻列表:')
        articles.forEach((article, index) => {
          console.log(`   ${index + 1}. [${article.source}] ${article.title}`)
          if (article.tags && article.tags.length > 0) {
            console.log(`      🏷️ 标签: ${article.tags.join(', ')}`)
          }
        })
        
        console.log('\n🔗 新闻链接 (前5个):')
        articles.slice(0, 5).forEach((article, index) => {
          console.log(`   ${index + 1}. ${article.url}`)
        })
      } else {
        console.log('⚠️ 没有抓取到任何文章')
      }
      
    } else {
      console.log('⚠️ 未找到文章数据文件')
    }
    
  } catch (error) {
    console.error('❌ 显示结果时出错:', error.message)
  }
  
  console.log('\n🎊 AI 技术新闻爬虫测试完成！')
  console.log('💡 这些都是最新的 AI 技术相关新闻，可以直接访问查看详细内容。')
}

// 启动测试
testAICrawler()