// 主入口文件
import { consola } from 'consola'
import { NewsScheduler } from './scheduler/news-scheduler.js'
import { BatchProcessor } from './processor/batch-processor.js'
import { ContentProcessor } from './processor/content-processor.js'
import { SimpleStorageManager as StorageManager } from './storage/simple-storage-manager.js'
import { NewsSourceManager } from './sources/news-source-manager.js'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'

const logger = consola.withTag('Main')

/**
 * 新闻抓取系统主类
 */
export class NewsClipperSystem {
  private scheduler: NewsScheduler
  private batchProcessor: BatchProcessor
  private contentProcessor: ContentProcessor
  private storageManager: StorageManager
  private sourceManager: NewsSourceManager
  private webClipper: WebClipperAdapter

  constructor() {
    // 初始化各个组件
    this.webClipper = new WebClipperAdapter()
    this.contentProcessor = new ContentProcessor()
    this.storageManager = new StorageManager()
    this.sourceManager = new NewsSourceManager()
    this.batchProcessor = new BatchProcessor(this.contentProcessor, this.sourceManager)
    this.scheduler = new NewsScheduler(
      this.batchProcessor,
      this.storageManager,
      this.sourceManager
    )
  }

  /**
   * 初始化系统
   */
  async init(): Promise<void> {
    logger.info('🚀 初始化新闻抓取系统...')
    
    try {
      await this.scheduler.init()
      logger.success('✅ 新闻抓取系统初始化完成')
    } catch (error) {
      logger.error('❌ 系统初始化失败', error)
      throw error
    }
  }

  /**
   * 启动系统
   */
  start(): void {
    logger.info('🎯 启动新闻抓取系统...')
    this.scheduler.start()
    logger.success('✅ 新闻抓取系统已启动')
  }

  /**
   * 停止系统
   */
  stop(): void {
    logger.info('🛑 停止新闻抓取系统...')
    this.scheduler.stop()
    logger.success('✅ 新闻抓取系统已停止')
  }

  /**
   * 手动执行一次抓取
   */
  async runOnce(): Promise<any> {
    return await this.scheduler.runOnce()
  }

  /**
   * 处理特定新闻源
   */
  async processSpecificSources(sourceIds: string[]): Promise<any> {
    return await this.scheduler.runSpecificSources(sourceIds)
  }

  /**
   * 获取系统状态
   */
  getStatus(): any {
    return this.scheduler.getStatus()
  }

  /**
   * 搜索文章
   */
  searchArticles(options: any): any {
    return this.storageManager.searchArticles(options)
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return this.storageManager.getStats()
  }

  /**
   * 优雅关闭系统
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 正在关闭系统...')
    await this.scheduler.shutdown()
    logger.success('✅ 系统已优雅关闭')
  }
}

// 导出所有核心组件
export {
  NewsScheduler,
  BatchProcessor,
  ContentProcessor,
  StorageManager,
  NewsSourceManager,
  WebClipperAdapter
}

// 导出类型定义
export * from './types/index.js'

// 主函数 - 用于直接运行
async function main() {
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    system.start()
    
    // 处理优雅关闭
    process.on('SIGINT', async () => {
      logger.info('📡 接收到关闭信号...')
      await system.shutdown()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      logger.info('📡 接收到终止信号...')
      await system.shutdown()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('❌ 系统启动失败', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，则启动系统
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}