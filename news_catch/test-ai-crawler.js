// 直接测试 AI 技术新闻爬虫
import { getAITechNewsCrawler } from './server/crawler/ai-tech-news.js'

console.log('🤖 开始测试 AI 技术新闻爬虫...')
console.log('📊 目标: 抓取最新的 AI 技术相关新闻')
console.log('🎯 新闻源: 36氪、IT之家、掘金、Solidot、少数派')

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
    console.error('❌ AI 爬虫测试失败:', error)
  }
}

async function showResults() {
  try {
    const { getSimpleDatabase } = await import('./server/database/simple.js')
    const db = getSimpleDatabase()
    
    console.log('\n📋 抓取结果:')
    const result = await db.searchArticles({ limit: 10, offset: 0 })
    if (result.items && result.items.length === 0) {
      console.log('   暂无文章')
    } else if (result.items) {
      result.items.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`)
        console.log(`      来源: ${article.source}`)
        console.log(`      时间: ${new Date(article.publishTime).toLocaleString()}`)
        console.log('')
      })
    } else {
      console.log('   无法获取文章列表')
    }
    
    console.log('✅ 测试完成')
    process.exit(0)
  } catch (error) {
    console.error('❌ 显示结果时出错:', error)
    process.exit(1)
  }
}

// 启动测试
testAICrawler()