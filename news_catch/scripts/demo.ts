import { initDatabase } from '../server/database/index.js'
import { SourceStorage } from '../server/database/sources.js'
import { ArticleStorage } from '../server/database/articles.js'
import { CrawlerEngine } from '../server/crawler/engine.js'
import useDatabase from '../server/database/index.js'
import logger from '../server/utils/logger.js'

async function runDemo() {
  try {
    logger.info('🚀 Starting News Catch Demo...')
    
    // Initialize database
    await initDatabase()
    logger.success('✅ Database initialized')
    
    const db = useDatabase()
    const sourceStorage = new SourceStorage(db)
    const articleStorage = new ArticleStorage(db)
    
    // Create crawler engine
    const crawler = new CrawlerEngine({
      maxConcurrent: 3,
      retryAttempts: 2,
      retryDelay: 1000,
      timeout: 15000,
      userAgent: 'NewsCatch-Demo/1.0',
    })
    
    // Add a test RSS source
    const testSource = {
      name: 'BBC News (Demo)',
      url: 'http://feeds.bbci.co.uk/news/rss.xml',
      type: 'rss' as const,
      config: {},
      enabled: true,
      interval: 300,
    }
    
    logger.info('📰 Adding test news source...')
    const sourceId = await sourceStorage.add(testSource)
    const source = await sourceStorage.get(sourceId)
    
    if (!source) {
      throw new Error('Failed to retrieve source')
    }
    
    logger.success(`✅ Source added: ${source.name}`)
    
    // Crawl the source
    logger.info('🕷️ Starting crawl...')
    const items = await crawler.crawlSource(source)
    logger.success(`✅ Crawled ${items.length} items`)
    
    // Process and save articles
    logger.info('💾 Processing articles...')
    let savedCount = 0
    
    for (const item of items.slice(0, 5)) { // Process first 5 items for demo
      try {
        const article = await crawler.parseToArticle(item, source)
        await articleStorage.save(article)
        savedCount++
        logger.info(`  📄 Saved: ${article.title.substring(0, 50)}...`)
      } catch (error) {
        logger.warn(`  ⚠️ Failed to save: ${item.title}`, error)
      }
    }
    
    logger.success(`✅ Saved ${savedCount} articles`)
    
    // Search articles
    logger.info('🔍 Searching articles...')
    const searchResult = await articleStorage.search({
      limit: 3,
      offset: 0,
    })
    
    logger.info(`📊 Found ${searchResult.total} total articles`)
    logger.info('📋 Recent articles:')
    
    searchResult.items.forEach((article, index) => {
      logger.info(`  ${index + 1}. ${article.title}`)
      logger.info(`     📅 ${article.publishTime.toISOString()}`)
      logger.info(`     🔗 ${article.url}`)
      logger.info('')
    })
    
    logger.success('🎉 Demo completed successfully!')
    
  } catch (error) {
    logger.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo()
}

export { runDemo }