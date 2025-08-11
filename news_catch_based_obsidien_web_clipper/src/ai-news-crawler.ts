// AI 新闻抓取器 - 专门抓取 AI 相关新闻
import { consola } from 'consola'
import { promises as fs } from 'fs'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'
import * as cheerio from 'cheerio'
import { ofetch } from 'ofetch'

const logger = consola.withTag('AINewsCrawler')

interface AINewsSource {
  id: string
  name: string
  baseUrl: string
  homepageUrl?: string
  rssUrls?: string[]
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

interface ArticleInfo {
  url: string
  time: Date
}

export class AINewsCrawler {
  private config!: AINewsConfig
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
    } catch (error: any) {
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

      } catch (error: any) {
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
    const maxArticles = this.config.globalSettings.maxArticlesPerSource

    // 1. 首先尝试从RSS获取文章
    if (source.rssUrls && source.rssUrls.length > 0) {
      try {
        logger.info(`📡 尝试从RSS获取文章: ${source.name}`)
        const rssArticles = await this.extractFromRSS(source)
        articles.push(...rssArticles)
        logger.info(`✅ 从RSS获取到 ${rssArticles.length} 篇文章`)
      } catch (error: any) {
        logger.warn(`⚠️ RSS抓取失败: ${source.name}`, error.message)
      }
    }

    // 2. 如果RSS获取的文章数量不足，尝试从首页获取
    if (articles.length < maxArticles && source.homepageUrl) {
      try {
        logger.info(`🏠 尝试从首页获取文章: ${source.name}`)
        const homepageArticles = await this.extractFromHomepage(source)
        // 过滤掉已经获取的文章
        const newArticles = homepageArticles.filter(
          homepageArticle => !articles.some(existingArticle => existingArticle.url === homepageArticle.url)
        )
        articles.push(...newArticles)
        logger.info(`✅ 从首页获取到 ${newArticles.length} 篇新文章`)
      } catch (error) {
        logger.warn(`⚠️ 首页抓取失败: ${source.name}`, error.message)
      }
    }

    // 3. 如果文章数量仍然不足，从搜索结果获取
    if (articles.length < maxArticles && source.searchUrls.length > 0) {
      try {
        logger.info(`🔍 尝试从搜索结果获取文章: ${source.name}`)
        const searchArticles = await this.extractFromSearch(source)
        // 过滤掉已经获取的文章
        const newArticles = searchArticles.filter(
          searchArticle => !articles.some(existingArticle => existingArticle.url === searchArticle.url)
        )
        articles.push(...newArticles)
        logger.info(`✅ 从搜索结果获取到 ${newArticles.length} 篇新文章`)
      } catch (error) {
        logger.warn(`⚠️ 搜索结果抓取失败: ${source.name}`, error.message)
      }
    }

    // 按时间排序，最新的在前面
    articles.sort((a, b) => b.publishTime.getTime() - a.publishTime.getTime())

    // 限制文章数量
    return articles.slice(0, maxArticles)
  }

  /**
   * 从RSS获取文章
   */
  private async extractFromRSS(source: AINewsSource): Promise<any[]> {
    if (!source.rssUrls || source.rssUrls.length === 0) {
      return []
    }

    const articles: any[] = []
    
    for (const rssUrl of source.rssUrls) {
      try {
        const xml = await ofetch(rssUrl, {
          timeout: this.config.globalSettings.timeout,
          headers: {
            'User-Agent': this.config.globalSettings.userAgent
          }
        })

        const $ = cheerio.load(xml, { xmlMode: true })
        const items = $('item')

        const rssArticles: any[] = []
        
        items.each((_, element) => {
          try {
            const title = $(element).find('title').text().trim()
            const link = $(element).find('link').text().trim()
            
            // 尝试多种方式获取链接
            let articleLink = link;
            if (!articleLink) {
              // 有些RSS源将链接放在属性中
              articleLink = $(element).find('link').attr('href') || ''
            }
            
            // 如果还获取不到，尝试guid
            if (!articleLink) {
              articleLink = $(element).find('guid').text().trim()
            }
            
            const description = $(element).find('description').text().trim()
            const pubDateStr = $(element).find('pubDate').text().trim()
            
            // 如果没有pubDate，尝试dc:date
            let pubDateStrFinal = pubDateStr;
            if (!pubDateStrFinal) {
              pubDateStrFinal = $(element).find('dc\\:date').text().trim()
            }
            
            if (articleLink) {
              const pubDate = pubDateStrFinal ? new Date(pubDateStrFinal) : new Date()
              rssArticles.push({
                title: title || '无标题',
                url: articleLink,
                rssDescription: description || '',
                publishTime: pubDate,
                source: source.name
              })
            }
          } catch (itemError: any) {
            logger.warn(`⚠️ 解析RSS项失败:`, itemError.message)
          }
        })

        // 对RSS文章进行完整内容提取
        const maxArticles = Math.min(rssArticles.length, this.config.globalSettings.maxArticlesPerSource)
        for (let i = 0; i < maxArticles; i++) {
          const rssArticle = rssArticles[i]
          try {
            logger.info(`📄 提取RSS文章内容: ${rssArticle.title}`)
            
            // 使用WebClipper提取完整内容
            const fullArticle = await this.extractArticle(rssArticle.url, source)
            
            if (fullArticle) {
              // 使用RSS中的信息补充或覆盖提取的信息
              fullArticle.publishTime = rssArticle.publishTime
              fullArticle.title = rssArticle.title || fullArticle.title
              
              // 如果提取的内容太短，使用RSS描述作为备用
              if (fullArticle.content.length < 100 && rssArticle.rssDescription) {
                fullArticle.content = rssArticle.rssDescription
                fullArticle.summary = rssArticle.rssDescription.substring(0, 200) + '...'
              }
              
              articles.push(fullArticle)
            } else {
              // 如果内容提取失败，至少保存RSS基本信息
              articles.push({
                title: rssArticle.title,
                content: rssArticle.rssDescription || '内容提取失败',
                summary: rssArticle.rssDescription ? rssArticle.rssDescription.substring(0, 200) + '...' : '内容提取失败',
                url: rssArticle.url,
                publishTime: rssArticle.publishTime,
                source: source.name,
                author: 'Unknown',
                hash: `ai-news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                images: [],
                tags: [...source.tags, 'AI新闻', 'RSS']
              })
            }
            
            // 文章之间延迟
            await this.delay(1500)
            
          } catch (error: any) {
            logger.warn(`⚠️ 提取RSS文章内容失败: ${rssArticle.url}`, error.message)
            
            // 即使提取失败，也保存基本信息
            articles.push({
              title: rssArticle.title,
              content: rssArticle.rssDescription || '内容提取失败',
              summary: rssArticle.rssDescription ? rssArticle.rssDescription.substring(0, 200) + '...' : '内容提取失败',
              url: rssArticle.url,
              publishTime: rssArticle.publishTime,
              source: source.name,
              author: 'Unknown',
              hash: `ai-news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              images: [],
              tags: [...source.tags, 'AI新闻', 'RSS']
            })
          }
        }

        // RSS之间延迟
        await this.delay(1000)
      } catch (error: any) {
        logger.warn(`⚠️ 获取RSS失败: ${rssUrl}`, error.message)
      }
    }

    return articles
  }

  /**
   * 从首页获取文章
   */
  private async extractFromHomepage(source: AINewsSource): Promise<any[]> {
    if (!source.homepageUrl) {
      return []
    }

    try {
      const html = await ofetch(source.homepageUrl, {
        timeout: this.config.globalSettings.timeout,
        headers: {
          'User-Agent': this.config.globalSettings.userAgent
        }
      })

      const $ = cheerio.load(html)
      const articles: ArticleInfo[] = []

      // 提取文章链接和时间
      $(source.selectors.articleLinks).each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const fullUrl = this.resolveUrl(href, source.baseUrl)
          if (fullUrl) {
            // 尝试提取文章发布时间
            const container = $(element).closest('.article-item, .post, .item, .news-item, .entry, .story')
            const timeElement = container.find(source.selectors.publishTime)
            const timeStr = timeElement.text().trim()
            const publishTime = this.parseTime(timeStr) || new Date()
            
            articles.push({
              url: fullUrl,
              time: publishTime
            })
          }
        }
      })

      // 按时间排序，最新的在前面
      articles.sort((a, b) => b.time.getTime() - a.time.getTime())

      // 提取文章内容
      const result: any[] = []
      const maxArticles = Math.min(
        articles.length, 
        Math.ceil(this.config.globalSettings.maxArticlesPerSource / (source.rssUrls && source.rssUrls.length > 0 ? 2 : 1))
      )

      for (let i = 0; i < maxArticles; i++) {
        const articleInfo = articles[i]
        try {
          const article = await this.extractArticle(articleInfo.url, source)
          if (article) {
            // 使用解析出的时间替换默认时间
            article.publishTime = articleInfo.time
            result.push(article)
          }
          
          // 文章之间延迟
          await this.delay(1000)
        } catch (error: any) {
          logger.warn(`⚠️ 提取首页文章失败: ${articleInfo.url}`, error.message)
        }
      }

      return result
    } catch (error: any) {
      logger.warn(`⚠️ 首页抓取失败: ${source.homepageUrl}`, error.message)
      return []
    }
  }

  /**
   * 从搜索结果获取文章
   */
  private async extractFromSearch(source: AINewsSource): Promise<any[]> {
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
            
          } catch (error: any) {
            logger.warn(`⚠️ 提取文章失败: ${articleUrl}`, error.message)
          }
        }

        // 搜索URL之间的延迟
        await this.delay(1500)

      } catch (error: any) {
        logger.warn(`⚠️ 搜索失败: ${searchUrl}`, error.message)
      }
      
      // 如果已获取足够文章，提前退出
      if (articles.length >= this.config.globalSettings.maxArticlesPerSource) {
        break
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
      const articles: ArticleInfo[] = []

      // 特殊处理掘金网站的搜索结果
      if (searchUrl.includes('juejin.cn/search')) {
        // 掘金搜索结果的特殊处理
        $('.result-item a[href^="/post"]').each((_, element) => {
          const href = $(element).attr('href')
          if (href) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl) {
              // 尝试提取文章发布时间
              const container = $(element).closest('.result-item')
              const timeElement = container.find('.username + .info, .info-box .time, .info .time')
              const timeStr = timeElement.text().trim()
              const publishTime = this.parseTime(timeStr) || new Date()
              
              // 检查是否已存在该URL
              if (!articles.some(a => a.url === fullUrl)) {
                articles.push({
                  url: fullUrl,
                  time: publishTime
                })
              }
            }
          }
        })
      } else {
        // 通用处理方式
        $(source.selectors.articleLinks).each((_, element) => {
          const href = $(element).attr('href')
          if (href) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl) {
              // 尝试提取文章发布时间
              const container = $(element).closest('.article-item, .post, .item, .news-item, .entry, .story')
              const timeElement = container.find(source.selectors.publishTime)
              const timeStr = timeElement.text().trim()
              const publishTime = this.parseTime(timeStr) || new Date()
              
              // 检查是否已存在该URL
              if (!articles.some(a => a.url === fullUrl)) {
                articles.push({
                  url: fullUrl,
                  time: publishTime
                })
              }
            }
          }
        })
      }

      // 按时间排序，最新的在前面
      articles.sort((a, b) => b.time.getTime() - a.time.getTime())

      logger.info(`🔗 发现 ${articles.length} 个文章链接`)
      // 只返回URL列表
      return articles.map(a => a.url)

    } catch (error: any) {
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
        hash: `ai-news-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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

    } catch (error: any) {
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

  /**
   * 解析时间字符串
   */
  private parseTime(timeStr: string): Date | null {
    if (!timeStr) return null;
    
    // 支持多种时间格式
    const formats = [
      'YYYY-MM-DD HH:mm:ss',
      'YYYY-MM-DD',
      'MM-DD HH:mm',
    ];
    
    // 解析相对时间
    if (timeStr.includes('刚刚')) {
      return new Date();
    } else if (timeStr.includes('分钟前')) {
      const minutesMatch = timeStr.match(/(\d+)/);
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      return new Date(Date.now() - minutes * 60 * 1000);
    } else if (timeStr.includes('小时前')) {
      const hoursMatch = timeStr.match(/(\d+)/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      return new Date(Date.now() - hours * 60 * 60 * 1000);
    } else if (timeStr.includes('天前')) {
      const daysMatch = timeStr.match(/(\d+)/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 0;
      return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    
    // 尝试解析绝对时间
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? null : date;
  }
}