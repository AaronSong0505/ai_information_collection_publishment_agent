// 自动化 AI 新闻爬虫 - 支持配置热重载
import { consola } from 'consola'
import { ConfigWatcher } from './config-watcher.js'
import { AINewsCrawler } from './ai-news-crawler.js'

const logger = consola.withTag('AutoAICrawler')

export class AutoAICrawler {
  private configWatcher: ConfigWatcher
  private crawler: AINewsCrawler
  private isRunning: boolean = false
  private crawlInterval: NodeJS.Timeout | null = null

  constructor(configPath?: string) {
    this.configWatcher = new ConfigWatcher(configPath)
    this.crawler = new AINewsCrawler(configPath)
  }

  /**
   * 启动自动化爬虫
   */
  async start(): Promise<void> {
    logger.info('🚀 启动自动化 AI 新闻爬虫...')

    // 初始化爬虫
    await this.crawler.init()

    // 启动配置监听
    await this.configWatcher.start()

    // 监听配置变化
    this.configWatcher.on('configChanged', ({ oldConfig, newConfig }) => {
      this.handleConfigChange(oldConfig, newConfig)
    })

    // 开始定时抓取
    this.startCrawling()

    this.isRunning = true
    logger.success('✅ 自动化 AI 新闻爬虫已启动')

    // 处理优雅关闭
    process.on('SIGINT', () => this.stop())
    process.on('SIGTERM', () => this.stop())
  }

  /**
   * 停止爬虫
   */
  stop(): void {
    logger.info('🛑 正在停止自动化爬虫...')

    this.isRunning = false

    if (this.crawlInterval) {
      clearInterval(this.crawlInterval)
      this.crawlInterval = null
    }

    this.configWatcher.stop()

    logger.success('✅ 自动化爬虫已停止')
    process.exit(0)
  }

  /**
   * 开始定时抓取
   */
  private startCrawling(): void {
    // 立即执行一次
    this.performCrawl()

    // 设置定时抓取 (每30分钟)
    this.crawlInterval = setInterval(() => {
      if (this.isRunning) {
        this.performCrawl()
      }
    }, 30 * 60 * 1000) // 30分钟

    logger.info('⏰ 定时抓取已启动 (每30分钟)')
  }

  /**
   * 执行抓取
   */
  private async performCrawl(): Promise<void> {
    try {
      logger.info('🔄 开始定时抓取...')

      const enabledSources = this.configWatcher.getEnabledSources()
      
      if (enabledSources.length === 0) {
        logger.warn('⚠️ 没有启用的新闻源，跳过抓取')
        return
      }

      logger.info(`📡 抓取 ${enabledSources.length} 个启用的新闻源`)

      const result = await this.crawler.crawlAllSources()

      logger.success(`✅ 抓取完成: 发现 ${result.totalArticles} 篇，保存 ${result.savedArticles} 篇`)

      // 显示各源统计
      Object.entries(result.sources).forEach(([sourceName, count]) => {
        if (count > 0) {
          logger.info(`   ${sourceName}: ${count} 篇`)
        }
      })

    } catch (error) {
      logger.error('❌ 定时抓取失败:', error.message)
    }
  }

  /**
   * 处理配置变化
   */
  private handleConfigChange(oldConfig: any, newConfig: any): void {
    logger.info('🔄 检测到配置变化，重新初始化爬虫...')

    // 重新初始化爬虫以使用新配置
    this.crawler = new AINewsCrawler()
    this.crawler.init().then(() => {
      logger.success('✅ 爬虫配置已更新')

      // 如果启用的源发生变化，立即执行一次抓取
      const oldEnabledCount = oldConfig?.sources?.filter((s: any) => s.enabled)?.length || 0
      const newEnabledCount = newConfig?.sources?.filter((s: any) => s.enabled)?.length || 0

      if (oldEnabledCount !== newEnabledCount) {
        logger.info('🔄 启用源数量发生变化，立即执行抓取...')
        setTimeout(() => this.performCrawl(), 2000)
      }
    }).catch(error => {
      logger.error('❌ 爬虫重新初始化失败:', error.message)
    })
  }

  /**
   * 手动触发抓取
   */
  async triggerCrawl(): Promise<void> {
    logger.info('🔄 手动触发抓取...')
    await this.performCrawl()
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isRunning: boolean
    enabledSources: number
    totalSources: number
    nextCrawlTime: string
  } {
    const config = this.configWatcher.getConfig()
    const enabledSources = config?.sources?.filter((s: any) => s.enabled)?.length || 0
    const totalSources = config?.sources?.length || 0

    // 计算下次抓取时间 (简化计算)
    const nextCrawlTime = new Date(Date.now() + 30 * 60 * 1000).toLocaleString()

    return {
      isRunning: this.isRunning,
      enabledSources,
      totalSources,
      nextCrawlTime
    }
  }
}

// 如果直接运行此文件，启动自动化爬虫
if (import.meta.url === `file://${process.argv[1]}`) {
  const autoCrawler = new AutoAICrawler()
  
  autoCrawler.start().catch(error => {
    logger.error('❌ 自动化爬虫启动失败:', error)
    process.exit(1)
  })
}