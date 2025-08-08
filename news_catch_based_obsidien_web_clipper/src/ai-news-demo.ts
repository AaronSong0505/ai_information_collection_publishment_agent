// AI 新闻演示
import { consola } from 'consola'
import { AINewsCrawler } from './ai-news-crawler.js'

const logger = consola.withTag('AINewsDemo')

async function runAINewsDemo() {
  logger.info('🤖 开始 AI 新闻抓取演示...')
  
  try {
    // 1. 初始化 AI 新闻爬虫
    const crawler = new AINewsCrawler()
    await crawler.init()
    
    // 2. 显示启用的新闻源
    const enabledSources = crawler.getEnabledSources()
    logger.info('📋 启用的 AI 新闻源:')
    enabledSources.forEach((source, index) => {
      logger.info(`   ${index + 1}. ${source.name} (${source.searchUrls.length} 个搜索URL)`)
    })
    
    // 3. 开始抓取
    logger.info('\n🚀 开始抓取 AI 相关新闻...')
    const result = await crawler.crawlAllSources()
    
    // 4. 显示结果
    logger.success('\n📊 抓取结果:')
    logger.info(`   总发现文章: ${result.totalArticles} 篇`)
    logger.info(`   成功保存: ${result.savedArticles} 篇`)
    
    logger.info('\n📰 各源统计:')
    Object.entries(result.sources).forEach(([sourceName, count]) => {
      logger.info(`   ${sourceName}: ${count} 篇`)
    })
    
    // 5. 显示存储统计
    const stats = await crawler.getStats()
    logger.info('\n💾 存储统计:')
    logger.info(`   数据库总文章: ${stats.totalArticles} 篇`)
    logger.info(`   最近24小时: ${stats.recentArticles} 篇`)
    
    // 6. 显示最新文章示例
    logger.info('\n📖 最新 AI 文章示例:')
    const recentArticles = stats.sourceStats
      .filter((source: any) => source.source.includes('AI') || source.source.includes('ai'))
      .slice(0, 3)
    
    if (recentArticles.length > 0) {
      recentArticles.forEach((source: any, index: number) => {
        logger.info(`   ${index + 1}. ${source.source}: ${source.count} 篇文章`)
      })
    }
    
    logger.success('\n🎉 AI 新闻抓取演示完成!')
    logger.info('\n💡 提示:')
    logger.info('   - 可以编辑 config/ai-news-sources.json 来调整新闻源')
    logger.info('   - 设置 enabled: true/false 来启用/禁用特定源')
    logger.info('   - 调整 keywords 来优化 AI 内容过滤')
    
  } catch (error) {
    logger.error('❌ AI 新闻演示失败:', error)
  }
}

// 运行演示
runAINewsDemo().catch(console.error)