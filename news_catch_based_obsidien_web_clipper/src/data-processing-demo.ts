// 数据清洗管理演示脚本
import { consola } from 'consola'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'

const logger = consola.withTag('DataProcessingDemo')

async function main() {
  logger.info('🧹 数据清洗管理演示开始...')

  // 初始化存储管理器
  const storage = new SimpleStorageManager()
  await storage.init()

  // 获取处理状态统计
  const stats = storage.getProcessingStats()
  logger.info('📊 当前处理状态统计:')
  logger.info(`   总文章数: ${stats.total}`)
  logger.info(`   已处理: ${stats.processed} (${stats.processingRate}%)`)
  logger.info(`   未处理: ${stats.unprocessed}`)

  // 获取未处理的文章（前5篇）
  const unprocessedArticles = storage.getUnprocessedArticles(5)
  if (unprocessedArticles.length > 0) {
    logger.info('\n📋 未处理文章示例:')
    unprocessedArticles.forEach((article, index) => {
      logger.info(`   ${index + 1}. ${article.title}`)
      logger.info(`      来源: ${article.source}`)
      logger.info(`      发布时间: ${article.publishTime.toLocaleString()}`)
      logger.info(`      哈希: ${article.hash}`)
      logger.info(`      处理状态: ${article.is_processed ? '✅ 已处理' : '❌ 未处理'}`)
      logger.info('')
    })

    // 演示：标记第一篇文章为已处理
    if (unprocessedArticles.length > 0) {
      logger.info('🔄 演示：标记第一篇文章为已处理...')
      const firstArticle = unprocessedArticles[0]
      await storage.markAsProcessed(firstArticle.hash)
      
      // 再次获取统计信息
      const newStats = storage.getProcessingStats()
      logger.info('📊 更新后的处理状态统计:')
      logger.info(`   已处理: ${newStats.processed} (${newStats.processingRate}%)`)
      logger.info(`   未处理: ${newStats.unprocessed}`)
    }
  } else {
    logger.info('✅ 所有文章都已处理完成！')
  }

  // 获取已处理的文章（前3篇）
  const processedArticles = storage.getProcessedArticles(3)
  if (processedArticles.length > 0) {
    logger.info('\n✅ 已处理文章示例:')
    processedArticles.forEach((article, index) => {
      logger.info(`   ${index + 1}. ${article.title}`)
      logger.info(`      来源: ${article.source}`)
      logger.info(`      处理状态: ${article.is_processed ? '✅ 已处理' : '❌ 未处理'}`)
      logger.info('')
    })
  }

  logger.success('🎉 数据清洗管理演示完成!')
  
  // 显示可用的管理方法
  logger.info('\n💡 可用的数据清洗管理方法:')
  logger.info('   - markAsProcessed(hash): 标记单篇文章为已处理')
  logger.info('   - markMultipleAsProcessed(hashes[]): 批量标记文章为已处理')
  logger.info('   - getUnprocessedArticles(limit?): 获取未处理的文章')
  logger.info('   - getProcessedArticles(limit?): 获取已处理的文章')
  logger.info('   - getProcessingStats(): 获取处理状态统计')
  logger.info('   - resetProcessingStatus(hashes?): 重置处理状态')

  storage.close()
}

main().catch(error => {
  logger.error('❌ 演示运行失败:', error)
  process.exit(1)
})