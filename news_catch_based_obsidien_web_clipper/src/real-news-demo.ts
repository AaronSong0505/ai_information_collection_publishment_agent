// 真实新闻演示
import { consola } from 'consola'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'

const logger = consola.withTag('RealNewsDemo')

async function runRealNewsDemo() {
  logger.info('🎬 开始真实新闻演示...')
  
  try {
    // 1. 初始化存储
    const storage = new SimpleStorageManager()
    await storage.init()
    
    // 2. 初始化 Web Clipper
    const clipper = new WebClipperAdapter()
    
    // 3. 测试真实新闻网站
    const testUrls = [
      'https://sspai.com',
      'https://www.solidot.org',
      'https://juejin.cn'
    ]
    
    logger.info(`🔍 测试 ${testUrls.length} 个新闻网站...`)
    
    for (const url of testUrls) {
      try {
        logger.info(`📡 正在处理: ${url}`)
        
        const result = await clipper.extractContent(url)
        
        logger.success(`✅ 提取成功: ${result.title}`)
        logger.info(`   内容长度: ${result.content.length} 字符`)
        logger.info(`   图片数量: ${result.images.length} 张`)
        
        // 保存文章
        const article = {
          title: result.title,
          content: result.content,
          summary: result.content.substring(0, 200) + '...',
          url: url,
          publishTime: result.metadata.publishTime || new Date(),
          source: new URL(url).hostname,
          author: result.metadata.author || 'Unknown',
          hash: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          images: result.images.map((imgUrl, index) => ({
            id: `img-${index}`,
            originalUrl: imgUrl,
            localPath: `./data/images/img-${index}.jpg`,
            format: 'jpg',
            size: 0,
            width: undefined,
            height: undefined
          })),
          tags: [new URL(url).hostname, 'news', 'auto-extracted']
        }
        
        await storage.saveArticle(article)
        
        // 添加延迟避免被限制
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        logger.error(`❌ 处理失败: ${url}`, error.message)
      }
    }
    
    // 4. 显示最终统计
    const stats = storage.getStats()
    logger.info('📊 最终统计:')
    logger.info(`   总文章数: ${stats.totalArticles}`)
    logger.info(`   总图片数: ${stats.totalImages}`)
    logger.info(`   最近文章: ${stats.recentArticles}`)
    
    logger.info('📰 新闻源统计:')
    stats.sourceStats.forEach(source => {
      logger.info(`   ${source.source}: ${source.count} 篇文章`)
    })
    
    // 5. 搜索演示
    logger.info('🔍 搜索演示:')
    const searchResult = storage.searchArticles({ limit: 3 })
    logger.info(`   找到 ${searchResult.total} 篇文章`)
    
    searchResult.items.forEach((article, index) => {
      logger.info(`   ${index + 1}. ${article.title} (${article.source})`)
    })
    
    logger.success('🎉 真实新闻演示完成!')
    
  } catch (error) {
    logger.error('❌ 演示失败:', error)
  }
}

// 运行演示
runRealNewsDemo().catch(console.error)