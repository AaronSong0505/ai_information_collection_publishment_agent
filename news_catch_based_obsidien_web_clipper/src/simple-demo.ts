// 简化演示 - 不依赖复杂的依赖
import { consola } from 'consola'
import { ObsidianClipperWrapper } from './clipper/obsidian-clipper-wrapper.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'

const logger = consola.withTag('SimpleDemo')

async function runSimpleDemo() {
  logger.info('🎬 开始简化演示...')
  
  try {
    // 1. 初始化存储
    const storage = new SimpleStorageManager()
    await storage.init()
    
    // 2. 测试简单的 Web Clipper (备用方案)
    const { WebClipperAdapter } = await import('./clipper/web-clipper-adapter.js')
    const clipper = new WebClipperAdapter()
    
    logger.info('🔍 测试内容提取...')
    
    // 使用一个简单的测试URL
    const testUrl = 'https://example.com'
    
    try {
      const result = await clipper.extractContent(testUrl)
      
      logger.success('✅ 内容提取成功')
      logger.info(`标题: ${result.title}`)
      logger.info(`内容长度: ${result.content.length} 字符`)
      logger.info(`图片数量: ${result.images.length} 张`)
      
      // 3. 保存到存储
      const article = {
        title: result.title,
        content: result.content,
        summary: result.content.substring(0, 200),
        url: testUrl,
        publishTime: new Date(),
        source: 'demo',
        author: result.metadata.author || 'Unknown',
        hash: `demo-${Date.now()}`,
        images: [],
        tags: ['demo', 'test']
      }
      
      await storage.saveArticle(article)
      
      // 4. 显示统计
      const stats = storage.getStats()
      logger.info('📊 存储统计:', stats)
      
      logger.success('🎉 演示完成!')
      
    } catch (error) {
      logger.error('❌ 内容提取失败:', error.message)
      logger.info('💡 这可能是因为网络问题或网站限制')
    }
    
  } catch (error) {
    logger.error('❌ 演示失败:', error)
  }
}

// 运行演示
runSimpleDemo().catch(console.error)