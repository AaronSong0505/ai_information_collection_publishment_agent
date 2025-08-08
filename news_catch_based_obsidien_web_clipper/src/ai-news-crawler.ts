// AI 新闻抓取器 - 专门抓取 AI 相关新闻
import { consola } from 'consola'
import { promises as fs } from 'fs'
import { join } from 'path'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'
import * as cheerio from 'cheerio'
import { ofetch } from 'ofetch'

const logger = consola.withTag('AINewsCrawler')

interface AINewsSource {
  id: string
  name: string
  baseUrl: string
  searchUrls: string[]
  enabled: boolean
  tags: string[]
  selectors: {
    articleLinks: string
    title: string
    content: string
    publishTime: string
  }
  keywords: string[]
  interval: number
}

interface AINewsConfig {
  sources: AINewsSource[]
  globalSettings: {
    maxArticlesPerSource: number
    contentMinLength: number
    enableKeywordFiltering: boolean
    keywordMatchThreshold: number
    excludeKeywords: string[]
    userAgent: string
    requestDelay: number
    timeout: number
  }
}

export class AINewsCrawler {
  private config: AINewsConfig
  private clipper: WebClipperAdapter
  private storage: SimpleStorageManager
  private configPath: string

  constructor(configPath: string = './config/ai-news-sources.json') {
    this.configPath = configPath
    this.clipper = new WebClipperAdapter()
    this.storage = new SimpleStorageManager()
  }

  /**
   * 初始化爬虫
   */
  async init(): Promise<void> {
    await this.loadConfig()
    await this.storage.init()
    logger.success('✅ AI 新闻爬虫初始化完成')
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(configData)
      logger.info(`📋 加载了 ${this.config.sources.length} 个 AI 新闻源`)
    } catch (error) {
      logger.error('❌ 配置文件加载失败:', error.message)
      throw error
    }
  }

  /**
   * 获取启用的新闻源
   */
  getEnabledSources(): AINewsSource[] {
    return this.config.sources.filter(source => source.enabled)
  }

  /**
   * 抓取所有启用的 AI 新闻源
   */
  async crawlAllSources(): Promise<{
    totalArticles: number
    savedArticles: number
    sources: { [key: string]: number }
  }> {
    const enabledSources = this.getEnabledSources()
    logger.info(`🚀 开始抓取 ${enabledSources.length} 个 AI 新闻源...`)

    let totalArticles = 0
    let savedArticles = 0
    const sourceStats: { [key: string]: number } = {}

    for (const source of enabledSources) {
      try {
        logger.info(`📡 正在处理: ${source.name}`)
        
        const articles = await this.crawlSource(source)
        totalArticles += articles.length

        // 保存文章
        for (const article of articles) {
          try {
            await this.storage.saveArticle(article)
            savedArticles++
          } catch (error) {
            if (!error.message.includes('已存在')) {
              logger.warn(`⚠️ 保存文章失败: ${article.title}`, error.message)
            }
          }
        }

        sourceStats[source.name] = articles.length
        logger.success(`✅ ${source.name}: 发现 ${articles.length} 篇文章`)

        // 源之间的延迟
        await this.delay(this.config.globalSettings.requestDelay)

      } catch (error) {
        logger.error(`❌ 处理失败: ${source.name}`, error.message)
        sourceStats[source.name] = 0
      }
    }

    logger.success(`🎉 抓取完成: 总计 ${totalArticles} 篇，保存 ${savedArticles} 篇`)
    return { totalArticles, savedArticles, sources: sourceStats }
  }

  /**
   * 抓取单个新闻源
   */
  private async crawlSource(source: AINewsSource): Promise<any[]> {
    const articles: any[] = []

    for (const searchUrl of source.searchUrls) {
      try {
        logger.info(`🔍 搜索: ${searchUrl}`)
        
        // 获取搜索页面的文章链接
        const articleUrls = await this.discoverArticleUrls(searchUrl, source)
        
        // 限制每个搜索URL的文章数量
        const limitedUrls = articleUrls.slice(0, Math.ceil(this.config.globalSettings.maxArticlesPerSource / source.searchUrls.length))
        
        for (const articleUrl of limitedUrls) {
          try {
            const article = await this.extractArticle(articleUrl, source)
            
            if (article && this.isAIRelated(article, source)) {
              articles.push(article)
            }
            
            // 文章之间的延迟
            await this.delay(1000)
            
          } catch (error) {
            logger.warn(`⚠️ 提取文章失败: ${articleUrl}`, error.message)
          }
        }

        // 搜索URL之间的延迟
        await this.delay(1500)

      } catch (error) {
        logger.warn(`⚠️ 搜索失败: ${searchUrl}`, error.message)
      }
    }

    return articles
  }

  /**
   * 发现文章URL
   */
  private async discoverArticleUrls(searchUrl: string, source: AINewsSource): Promise<string[]> {
    try {
      const html = await ofetch(searchUrl, {
        timeout: this.config.globalSettings.timeout,
        headers: {
          'User-Agent': this.config.globalSettings.userAgent
        }
      })

      const $ = cheerio.load(html)
      const urls: string[] = []

      $(source.selectors.articleLinks).each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const fullUrl = this.resolveUrl(href, source.baseUrl)
          if (fullUrl && !urls.includes(fullUrl)) {
            urls.push(fullUrl)
          }
        }
      })

      logger.info(`🔗 发现 ${urls.length} 个文章链接`)
      return urls

    } catch (error) {
      logger.warn(`⚠️ 发现文章URL失败: ${searchUrl}`, error.message)
      return []
    }
  }

  /**
   * 提取单篇文章
   */
  private async extractArticle(url: string, source: AINewsSource): Promise<any | null> {
    try {
      const result = await this.clipper.extractContent(url)
      
      if (!result.title || result.content.length < this.config.globalSettings.contentMinLength) {
        return null
      }

      return {
        title: result.title,
        content: result.content,
        summary: result.content.substring(0, 200) + '...',
        url: url,
        publishTime: result.metadata.publishTime || new Date(),
        source: source.name,
        author: result.metadata.author || 'Unknown',
        hash: `ai-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        images: result.images.map((imgUrl, index) => ({
          id: `img-${index}`,
          originalUrl: imgUrl,
          localPath: `./data/images/img-${index}.jpg`,
          format: 'jpg',
          size: 0,
          width: undefined,
          height: undefined
        })),
        tags: [...source.tags, 'AI新闻', '自动抓取']
      }

    } catch (error) {
      logger.warn(`⚠️ 提取文章失败: ${url}`, error.message)
      return null
    }
  }

  /**
   * 判断是否为 AI 相关内容
   */
  private isAIRelated(article: any, source: AINewsSource): boolean {
    if (!this.config.globalSettings.enableKeywordFiltering) {
      return true
    }

    const text = (article.title + ' ' + article.content).toLowerCase()
    
    // 检查排除关键词
    const hasExcludeKeywords = this.config.globalSettings.excludeKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    )
    
    if (hasExcludeKeywords) {
      return false
    }

    // 检查 AI 相关关键词
    const matchedKeywords = source.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    )

    const isRelevant = matchedKeywords.length >= this.config.globalSettings.keywordMatchThreshold
    
    if (isRelevant) {
      logger.info(`✅ AI 相关: ${article.title} (匹配关键词: ${matchedKeywords.join(', ')})`)
    }

    return isRelevant
  }

  /**
   * 解析相对URL为绝对URL
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      if (href.startsWith('http')) {
        return href
      }
      
      if (href.startsWith('//')) {
        return 'https:' + href
      }
      
      if (href.startsWith('/')) {
        const base = new URL(baseUrl)
        return base.origin + href
      }
      
      return new URL(href, baseUrl).href
      
    } catch {
      return null
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<any> {
    const stats = this.storage.getStats()
    const enabledSources = this.getEnabledSources()
    
    return {
      ...stats,
      enabledSources: enabledSources.length,
      totalSources: this.config.sources.length,
      sourceNames: enabledSources.map(s => s.name)
    }
  }

  /**
   * 更新新闻源状态
   */
  async toggleSource(sourceId: string, enabled: boolean): Promise<void> {
    const source = this.config.sources.find(s => s.id === sourceId)
    if (source) {
      source.enabled = enabled
      await this.saveConfig()
      logger.info(`${enabled ? '✅ 启用' : '❌ 禁用'} 新闻源: ${source.name}`)
    }
  }

  /**
   * 保存配置文件
   */
  private async saveConfig(): Promise<void> {
    const configData = JSON.stringify(this.config, null, 2)
    await fs.writeFile(this.configPath, configData, 'utf-8')
  }
}