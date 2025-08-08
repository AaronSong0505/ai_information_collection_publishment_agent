// 新闻源管理工具
import { consola } from 'consola'
import { promises as fs } from 'fs'
import { AINewsCrawler } from './ai-news-crawler.js'

const logger = consola.withTag('SourceManager')

async function manageAISources() {
  logger.info('⚙️ AI 新闻源管理工具')
  
  try {
    const crawler = new AINewsCrawler()
    await crawler.init()
    
    // 显示所有新闻源状态
    const configPath = './config/ai-news-sources.json'
    const configData = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configData)
    
    logger.info('\n📋 所有 AI 新闻源状态:')
    config.sources.forEach((source: any, index: number) => {
      const status = source.enabled ? '✅ 启用' : '❌ 禁用'
      logger.info(`${index + 1}. ${source.name} - ${status}`)
      logger.info(`   ID: ${source.id}`)
      logger.info(`   搜索URL数量: ${source.searchUrls.length}`)
      logger.info(`   关键词: ${source.keywords.slice(0, 3).join(', ')}...`)
      logger.info(`   抓取间隔: ${source.interval} 分钟`)
      logger.info('')
    })
    
    // 显示全局设置
    logger.info('🌐 全局设置:')
    logger.info(`   每源最大文章数: ${config.globalSettings.maxArticlesPerSource}`)
    logger.info(`   内容最小长度: ${config.globalSettings.contentMinLength}`)
    logger.info(`   启用关键词过滤: ${config.globalSettings.enableKeywordFiltering}`)
    logger.info(`   关键词匹配阈值: ${config.globalSettings.keywordMatchThreshold}`)
    logger.info(`   排除关键词: ${config.globalSettings.excludeKeywords.join(', ')}`)
    
    logger.info('\n💡 管理提示:')
    logger.info('1. 编辑 config/ai-news-sources.json 来修改配置')
    logger.info('2. 设置 "enabled": true/false 来启用/禁用新闻源')
    logger.info('3. 调整 "keywords" 数组来优化内容过滤')
    logger.info('4. 修改 "interval" 来调整抓取频率')
    logger.info('5. 添加新的 "searchUrls" 来扩展搜索范围')
    
  } catch (error) {
    logger.error('❌ 新闻源管理失败:', error)
  }
}

// 运行管理工具
manageAISources().catch(console.error)