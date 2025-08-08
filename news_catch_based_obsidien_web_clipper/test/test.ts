// 测试文件
import { consola } from 'consola'
import { WebClipperAdapter } from '../src/clipper/web-clipper-adapter.js'
import { ContentProcessor } from '../src/processor/content-processor.js'
import { NewsSourceManager } from '../src/sources/news-source-manager.js'
import { StorageManager } from '../src/storage/storage-manager.js'

const logger = consola.withTag('Test')

async function testObsidianClipper() {
  logger.info('🧪 测试 Obsidian Web Clipper 集成...')
  
  const { ObsidianClipperWrapper } = await import('../src/clipper/obsidian-clipper-wrapper.js')
  const clipper = new ObsidianClipperWrapper()
  
  try {
    // 测试抓取一个简单的网页
    const testUrl = 'https://sspai.com'
    const result = await clipper.extractContent(testUrl)
    
    logger.success('✅ Obsidian Web Clipper 集成测试成功')
    logger.info(`标题: ${result.title}`)
    logger.info(`内容长度: ${result.content.length} 字符`)
    logger.info(`图片数量: ${result.images.length} 张`)
    
  } catch (error) {
    logger.error('❌ Obsidian Web Clipper 测试失败:', error.message)
    
    // 测试备用方案
    logger.info('🔄 测试备用方案...')
    const backupClipper = new WebClipperAdapter()
    try {
      const backupResult = await backupClipper.extractContent(testUrl)
      logger.success('✅ 备用方案测试成功')
    } catch (backupError) {
      logger.error('❌ 备用方案也失败:', backupError.message)
    }
  }
}

async function testContentProcessor() {
  logger.info('🧪 测试内容处理器...')
  
  const processor = new ContentProcessor()
  
  try {
    // 测试处理一个URL
    const testUrl = 'https://sspai.com'
    const result = await processor.processUrl(testUrl, 'test')
    
    if (result.success && result.article) {
      logger.success('✅ 内容处理器测试成功')
      logger.info(`文章标题: ${result.article.title}`)
      logger.info(`处理时间: ${result.processingTime}ms`)
      logger.info(`图片数量: ${result.article.images.length}`)
    } else {
      logger.warn('⚠️ 内容处理器测试部分成功:', result.error)
    }
    
  } catch (error) {
    logger.error('❌ 内容处理器测试失败:', error.message)
  }
}

async function testNewsSourceManager() {
  logger.info('🧪 测试新闻源管理器...')
  
  const sourceManager = new NewsSourceManager()
  
  try {
    await sourceManager.init()
    
    const sources = sourceManager.getAllSources()
    logger.success(`✅ 新闻源管理器测试成功: 加载了 ${sources.length} 个新闻源`)
    
    const enabledSources = sourceManager.getEnabledSources()
    logger.info(`启用的新闻源: ${enabledSources.length} 个`)
    
    // 测试验证新闻源
    if (enabledSources.length > 0) {
      const firstSource = enabledSources[0]
      logger.info(`验证新闻源: ${firstSource.name}`)
      
      const isValid = await sourceManager.validateSource(firstSource)
      logger.info(`验证结果: ${isValid ? '✅ 有效' : '❌ 无效'}`)
    }
    
  } catch (error) {
    logger.error('❌ 新闻源管理器测试失败:', error.message)
  }
}

async function testStorageManager() {
  logger.info('🧪 测试存储管理器...')
  
  const storageManager = new StorageManager('./test-data')
  
  try {
    await storageManager.init()
    
    // 创建测试文章
    const testArticle = {
      title: '测试文章',
      content: '这是一篇测试文章的内容',
      summary: '测试摘要',
      url: 'https://test.com/article/1',
      publishTime: new Date(),
      source: 'test',
      author: '测试作者',
      hash: 'test-hash-' + Date.now(),
      images: [],
      tags: ['测试', '文章']
    }
    
    await storageManager.saveArticle(testArticle)
    logger.success('✅ 存储管理器测试成功: 文章已保存')
    
    // 测试搜索
    const searchResult = storageManager.searchArticles({ limit: 1 })
    logger.info(`搜索结果: ${searchResult.total} 篇文章`)
    
    // 获取统计信息
    const stats = storageManager.getStats()
    logger.info('存储统计:', stats)
    
    storageManager.close()
    
  } catch (error) {
    logger.error('❌ 存储管理器测试失败:', error.message)
  }
}

async function runAllTests() {
  logger.info('🚀 开始运行所有测试...')
  
  await testObsidianClipper()
  await testContentProcessor()
  await testNewsSourceManager()
  await testStorageManager()
  
  logger.success('🎉 所有测试完成!')
}

// 运行测试
runAllTests().catch(console.error)