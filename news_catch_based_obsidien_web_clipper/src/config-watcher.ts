// 配置文件监听器 - 自动重载配置
import { promises as fs } from 'fs'
import { watch } from 'fs'
import { consola } from 'consola'
import { EventEmitter } from 'events'

const logger = consola.withTag('ConfigWatcher')

export class ConfigWatcher extends EventEmitter {
  private configPath: string
  private config: any
  private watcher: any

  constructor(configPath: string = './config/ai-news-sources.json') {
    super()
    this.configPath = configPath
  }

  /**
   * 启动配置监听
   */
  async start(): Promise<void> {
    // 初始加载配置
    await this.loadConfig()

    // 监听文件变化
    this.watcher = watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        this.handleConfigChange()
      }
    })

    logger.success(`✅ 开始监听配置文件: ${this.configPath}`)
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      logger.info('📴 停止配置文件监听')
    }
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8')
      const newConfig = JSON.parse(configData)
      
      // 检查配置是否有变化
      if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
        const oldConfig = this.config
        this.config = newConfig
        
        logger.success('🔄 配置文件已重载')
        this.emit('configChanged', { oldConfig, newConfig: this.config })
        
        // 分析变化
        this.analyzeChanges(oldConfig, this.config)
      }
      
    } catch (error) {
      logger.error('❌ 配置文件加载失败:', error.message)
    }
  }

  /**
   * 处理配置文件变化
   */
  private async handleConfigChange(): Promise<void> {
    // 延迟一点时间，确保文件写入完成
    setTimeout(async () => {
      await this.loadConfig()
    }, 500)
  }

  /**
   * 分析配置变化
   */
  private analyzeChanges(oldConfig: any, newConfig: any): void {
    if (!oldConfig) {
      logger.info('📋 初始配置加载完成')
      return
    }

    // 检查新闻源启用状态变化
    const oldSources = oldConfig.sources || []
    const newSources = newConfig.sources || []

    newSources.forEach((newSource: any) => {
      const oldSource = oldSources.find((s: any) => s.id === newSource.id)
      
      if (oldSource && oldSource.enabled !== newSource.enabled) {
        const status = newSource.enabled ? '✅ 启用' : '❌ 禁用'
        logger.info(`🔄 ${status} 新闻源: ${newSource.name}`)
      }
    })

    // 检查全局设置变化
    if (oldConfig.globalSettings && newConfig.globalSettings) {
      const oldGlobal = oldConfig.globalSettings
      const newGlobal = newConfig.globalSettings

      if (oldGlobal.maxArticlesPerSource !== newGlobal.maxArticlesPerSource) {
        logger.info(`📊 每源最大文章数: ${oldGlobal.maxArticlesPerSource} → ${newGlobal.maxArticlesPerSource}`)
      }

      if (oldGlobal.enableKeywordFiltering !== newGlobal.enableKeywordFiltering) {
        const status = newGlobal.enableKeywordFiltering ? '启用' : '禁用'
        logger.info(`🔍 关键词过滤: ${status}`)
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): any {
    return this.config
  }

  /**
   * 获取启用的新闻源
   */
  getEnabledSources(): any[] {
    if (!this.config || !this.config.sources) {
      return []
    }
    return this.config.sources.filter((source: any) => source.enabled)
  }

  /**
   * 获取全局设置
   */
  getGlobalSettings(): any {
    return this.config?.globalSettings || {}
  }
}