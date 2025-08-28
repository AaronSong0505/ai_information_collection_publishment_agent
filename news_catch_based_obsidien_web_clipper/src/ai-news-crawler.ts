// AI 新闻抓取器 - 专门抓取 AI 相关新闻
import { consola } from 'consola'
import { promises as fs } from 'fs'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'
import { ImageProcessor } from './utils/image-processor.js'
import { NetworkHelper } from './utils/network-helper.js'
import * as cheerio from 'cheerio'

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
  private imageProcessor: ImageProcessor
  private configPath: string

  constructor(configPath: string = './config/ai-news-sources.json') {
    this.configPath = configPath
    this.clipper = new WebClipperAdapter()
    this.storage = new SimpleStorageManager()
    this.imageProcessor = new ImageProcessor('./data/images')
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
          } catch (error: any) {
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

    // 清理空的图片目录
    try {
      await this.imageProcessor.cleanupEmptyDirectories()
    } catch (error: any) {
      logger.debug(`⚠️ 清理空目录失败:`, error.message)
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
      } catch (error: any) {
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
        const xml = await NetworkHelper.fetchRSS(rssUrl, {
          timeout: this.config.globalSettings.timeout,
          userAgent: this.config.globalSettings.userAgent,
          maxRetries: 3,
          retryDelay: 3000
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

        // 去重：根据URL去除重复的RSS文章
        const uniqueRssArticles = rssArticles.filter((article, index, self) => 
          index === self.findIndex(a => a.url === article.url)
        )
        
        logger.info(`📋 RSS去重后: ${uniqueRssArticles.length}/${rssArticles.length} 篇文章`)
        
        // 对RSS文章进行完整内容提取
        const maxArticles = Math.min(uniqueRssArticles.length, this.config.globalSettings.maxArticlesPerSource)
        for (let i = 0; i < maxArticles; i++) {
          const rssArticle = uniqueRssArticles[i]
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
              tags: [...source.tags, 'AI新闻', 'RSS'],
              is_processed: false  // RSS备用文章默认未处理
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
      const html = await NetworkHelper.fetchHTML(source.homepageUrl, {
        timeout: this.config.globalSettings.timeout,
        userAgent: this.config.globalSettings.userAgent,
        maxRetries: 2,
        retryDelay: 2000
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
      const html = await NetworkHelper.fetchHTML(searchUrl, {
        timeout: this.config.globalSettings.timeout,
        userAgent: this.config.globalSettings.userAgent,
        maxRetries: 2,
        retryDelay: 1500
      })

      const $ = cheerio.load(html)
      const articles: ArticleInfo[] = []

      // 针对不同网站的特殊处理
      if (searchUrl.includes('techcrunch.com')) {
        // TechCrunch 搜索结果页面
        $('.post-block__title__link, .wp-block-tc23-post-picker a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('theverge.com')) {
        // The Verge 搜索结果页面
        $('.c-entry-box--compact__title a, .c-compact-river__entry a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('venturebeat.com')) {
        // VentureBeat 搜索结果页面
        $('.ArticleListing__title-link, .post-title a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('36kr.com')) {
        // 36氪 搜索结果页面
        $('.article-item-title a, .kr-flow-article-title a, .search-result-item a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('ithome.com')) {
        // IT之家 搜索结果页面
        if (searchUrl.includes('next.ithome.com')) {
          // 新版IT之家AI页面
          $('.post-title a, .news-item a, .article-item a, h2 a, h3 a').each((_, element) => {
            const href = $(element).attr('href')
            if (href && this.isValidArticleUrl(href, source.baseUrl)) {
              const fullUrl = this.resolveUrl(href, source.baseUrl)
              if (fullUrl && !articles.some(a => a.url === fullUrl)) {
                articles.push({
                  url: fullUrl,
                  time: new Date()
                })
              }
            }
          })
        } else {
          // 传统IT之家搜索页面
          $('.lst a, .post-title a, .search-result a, h2 a, h3 a').each((_, element) => {
            const href = $(element).attr('href')
            if (href && this.isValidArticleUrl(href, source.baseUrl)) {
              const fullUrl = this.resolveUrl(href, source.baseUrl)
              if (fullUrl && !articles.some(a => a.url === fullUrl)) {
                articles.push({
                  url: fullUrl,
                  time: new Date()
                })
              }
            }
          })
        }
      } else if (searchUrl.includes('reuters.com')) {
        // Reuters 搜索结果页面
        $('.story-card a, .media-story-card__headline__link, .search-result-item a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('technologyreview.com')) {
        // MIT Technology Review 搜索结果页面
        $('.teaserItem__title a, .contentTitle a, .search-result a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('solidot.org')) {
        // Solidot 搜索结果页面
        $('.story-title a, .search-result a, h2 a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('hn.algolia.com')) {
        // Hacker News Algolia 搜索结果
        $('.Story_title a, .storylink, h2 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && href.startsWith('http') && !href.includes('news.ycombinator.com')) {
            // 排除明显的招聘和非AI相关链接
            const excludePatterns = [
              'careers', 'jobs', 'hiring', 'recruit',
              'github.com/.*/(careers|jobs)',
              'linkedin.com',
              'angel.co',
              'wellfound.com'
            ]
            
            const shouldExclude = excludePatterns.some(pattern => {
              const regex = new RegExp(pattern, 'i')
              return regex.test(href)
            })
            
            if (!shouldExclude && !articles.some(a => a.url === href)) {
              articles.push({
                url: href,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('arxiv.org')) {
        // arXiv 搜索结果页面
        $('dt a[title="Abstract"], .list-title a, .title a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && (href.includes('/abs/') || href.includes('arxiv.org'))) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else if (searchUrl.includes('paperswithcode.com')) {
        // Papers With Code 搜索结果页面
        $('.paper-title a, h3 a').each((_, element) => {
          const href = $(element).attr('href')
          if (href && this.isValidArticleUrl(href, source.baseUrl)) {
            const fullUrl = this.resolveUrl(href, source.baseUrl)
            if (fullUrl && !articles.some(a => a.url === fullUrl)) {
              articles.push({
                url: fullUrl,
                time: new Date()
              })
            }
          }
        })
      } else {
        // 通用处理方式 - 尝试多种常见的文章链接选择器
        const commonSelectors = [
          'a[href*="/article"]',
          'a[href*="/post"]',
          'a[href*="/news"]',
          'a[href*="/story"]',
          '.article-title a',
          '.post-title a',
          '.entry-title a',
          '.story-title a',
          'h2 a',
          'h3 a',
          source.selectors.articleLinks
        ]

        for (const selector of commonSelectors) {
          $(selector).each((_, element) => {
            const href = $(element).attr('href')
            if (href && this.isValidArticleUrl(href, source.baseUrl)) {
              const fullUrl = this.resolveUrl(href, source.baseUrl)
              if (fullUrl && !articles.some(a => a.url === fullUrl)) {
                articles.push({
                  url: fullUrl,
                  time: new Date()
                })
              }
            }
          })
          
          // 如果已经找到足够的文章，就停止
          if (articles.length >= 20) break
        }
      }

      // 按时间排序，最新的在前面（虽然这里都是当前时间，但保持一致性）
      articles.sort((a, b) => b.time.getTime() - a.time.getTime())

      logger.info(`🔗 发现 ${articles.length} 个文章链接`)
      // 只返回URL列表，限制数量避免过多
      return articles.slice(0, 15).map(a => a.url)

    } catch (error: any) {
      logger.warn(`⚠️ 发现文章URL失败: ${searchUrl}`, error.message)
      return []
    }
  }

  /**
   * 验证是否为有效的文章URL
   */
  private isValidArticleUrl(url: string, baseUrl: string): boolean {
    if (!url) return false
    
    // 排除无效的链接
    const invalidPatterns = [
      '#',
      'javascript:',
      'mailto:',
      '/search',
      '/tag/',
      '/category/',
      '/author/',
      '/page/',
      'facebook.com',
      'twitter.com',
      'linkedin.com',
      'youtube.com'
    ]
    
    if (invalidPatterns.some(pattern => url.includes(pattern))) {
      return false
    }
    
    // 检查是否是文章类型的URL
    const articlePatterns = [
      '/article',
      '/post',
      '/news',
      '/story',
      '/blog',
      '/content',
      '/item',
      '/p/',
      '/archives',
      '.htm',
      '.html',
      '/20', // 年份模式，如 /2024/
      '/0/' // IT之家的文章模式
    ]
    
    // 如果是相对路径或者包含文章模式，认为是有效的
    return !url.startsWith('http') || articlePatterns.some(pattern => url.includes(pattern))
  }

  /**
   * 提取单篇文章
   */
  private async extractArticle(url: string, source: AINewsSource): Promise<any | null> {
    try {
      logger.info(`📄 开始提取文章: ${url}`)
      
      const result = await this.clipper.extractContent(url)
      
      if (!result.title || result.content.length < this.config.globalSettings.contentMinLength) {
        logger.warn(`⚠️ 文章内容不足: ${result.title} (${result.content.length} 字符)`)
        return null
      }

      // 生成文章ID
      const articleId = `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      
      // 处理图片 - 实际下载到本地
      let processedImages: any[] = []
      let imageMap = new Map<string, string>()
      
      if (result.images && result.images.length > 0) {
        logger.info(`🖼️ 发现 ${result.images.length} 张图片，开始筛选和下载...`)
        
        // 先过滤明显无效的图片URL
        const validImageUrls = result.images.filter(url => {
          const isValid = this.isValidImageUrlForCrawler(url)
          if (!isValid) {
            logger.debug(`🚫 跳过无效图片: ${url}`)
          }
          return isValid
        })
        
        logger.info(`📋 筛选后有效图片: ${validImageUrls.length}/${result.images.length} 张`)
        
        if (validImageUrls.length > 0) {
          try {
            const imageResult = await this.imageProcessor.processImages(validImageUrls, articleId)
            processedImages = imageResult.images
            imageMap = imageResult.imageMap
            
            logger.success(`✅ 图片处理完成: ${processedImages.length}/${validImageUrls.length} 张成功下载`)
          } catch (error: any) {
            logger.warn(`⚠️ 图片处理失败:`, error.message)
            // 即使图片处理失败，也保留原始URL信息
            processedImages = validImageUrls.map((imgUrl, index) => ({
              id: `img-${index}`,
              originalUrl: imgUrl,
              localPath: '',
              format: 'jpg',
              size: 0,
              width: undefined,
              height: undefined
            }))
          }
        }
      }

      // 替换内容中的图片URL为本地路径标签
      let processedContent = result.content
      if (imageMap.size > 0) {
        imageMap.forEach((imageId, originalUrl) => {
          // 将图片URL替换为图片标签
          const imageTagRegex = new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          processedContent = processedContent.replace(imageTagRegex, `<|${imageId}|>`)
        })
      }

      const article = {
        title: result.title,
        content: processedContent,
        summary: result.content.substring(0, 200) + '...',
        url: url,
        publishTime: result.metadata.publishTime || new Date(),
        source: source.name,
        author: result.metadata.author || 'Unknown',
        hash: articleId,
        images: processedImages,
        tags: [...source.tags, 'AI新闻', '自动抓取'],
        is_processed: false  // 新抓取的文章默认未处理
      }

      logger.success(`✅ 文章提取成功: ${article.title} (${processedContent.length} 字符, ${processedImages.length} 张图片)`)
      return article

    } catch (error: any) {
      logger.warn(`⚠️ 提取文章失败: ${url}`, error.message)
      return null
    }
  }

  /**
   * 判断是否为 AI 相关内容 - 改进的智能过滤
   */
  private isAIRelated(article: any, source: AINewsSource): boolean {
    if (!this.config.globalSettings.enableKeywordFiltering) {
      return true
    }

    const title = article.title.toLowerCase()
    const content = article.content.toLowerCase()
    const text = title + ' ' + content
    
    // 1. 首先检查强排除关键词（优先级最高）
    const strongExcludeKeywords = [
      '招聘', '求职', '工作', '职位', '面试', 'hiring', 'job', 'career', 'recruit',
      '广告', '推广', '营销', '赞助', 'advertisement', 'sponsored', 'affiliate',
      '游戏', 'game', 'gaming', '电竞', 'esports', // 游戏相关（除非明确提到AI）
      '股票', '投资', '理财', 'stock', 'investment', 'finance', // 金融相关（除非明确提到AI）
      '娱乐', 'entertainment', '明星', 'celebrity', // 娱乐相关
      '体育', 'sports', '足球', 'football', '篮球', 'basketball' // 体育相关
    ]
    
    const hasStrongExclude = strongExcludeKeywords.some(keyword => text.includes(keyword))
    
    // 2. 检查核心AI关键词（高权重）
    const coreAIKeywords = [
      'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
      'LLM', 'large language model', 'VLM', 'vision language model',
      'transformer', 'attention', 'diffusion', 'RLHF', 'RAG',
      'chatgpt', 'gpt-4', 'gpt-5', 'claude', 'gemini', 'llama',
      '大模型', '智能体', 'agent', '多模态', 'multimodal',
      '神经网络', '深度学习', '机器学习', '人工智能'
    ]
    
    const coreMatches = coreAIKeywords.filter(keyword => text.includes(keyword))
    
    // 3. 检查扩展AI关键词（中权重）
    const extendedAIKeywords = [
      'AI', 'ai', 'openai', 'anthropic', 'google ai', 'microsoft ai',
      'computer vision', 'natural language processing', 'nlp',
      'reinforcement learning', 'generative ai', 'AGI',
      'prompt', 'fine-tuning', 'training', 'inference',
      '提示词', '微调', '训练', '推理', '算法', 'algorithm'
    ]
    
    const extendedMatches = extendedAIKeywords.filter(keyword => text.includes(keyword))
    
    // 4. 检查应用场景关键词（低权重）
    const applicationKeywords = [
      'automation', 'robotics', 'autonomous', 'self-driving',
      'recommendation', 'prediction', 'classification', 'detection',
      '自动化', '机器人', '自动驾驶', '推荐系统', '预测', '分类', '检测'
    ]
    
    const applicationMatches = applicationKeywords.filter(keyword => text.includes(keyword))
    
    // 5. 计算相关性得分
    let relevanceScore = 0
    
    // 核心关键词：每个3分
    relevanceScore += coreMatches.length * 3
    
    // 扩展关键词：每个2分
    relevanceScore += extendedMatches.length * 2
    
    // 应用场景关键词：每个1分
    relevanceScore += applicationMatches.length * 1
    
    // 标题中的关键词加权（标题更重要）
    const titleCoreMatches = coreAIKeywords.filter(keyword => title.includes(keyword))
    const titleExtendedMatches = extendedAIKeywords.filter(keyword => title.includes(keyword))
    relevanceScore += titleCoreMatches.length * 2 // 标题核心关键词额外加2分
    relevanceScore += titleExtendedMatches.length * 1 // 标题扩展关键词额外加1分
    
    // 6. 特殊情况处理
    if (hasStrongExclude) {
      // 如果有强排除关键词，需要更高的AI相关性得分才能通过
      if (coreMatches.length < 2) {
        logger.info(`❌ 排除文章: ${article.title} (包含排除关键词且AI相关性不足)`)
        return false
      }
      // 有强排除关键词但AI相关性很强，降低得分但不完全排除
      relevanceScore = Math.max(0, relevanceScore - 3)
    }
    
    // 7. 判断是否相关（动态阈值）
    let threshold = 4 // 基础阈值
    
    // 根据来源调整阈值
    if (source.name.includes('AI') || source.name.includes('人工智能')) {
      threshold = 2 // AI专门源降低阈值
    }
    
    // 根据文章长度调整阈值
    if (content.length < 500) {
      threshold += 1 // 短文章提高阈值
    }
    
    const isRelevant = relevanceScore >= threshold
    
    // 8. 记录详细信息
    const allMatches = [...coreMatches, ...extendedMatches, ...applicationMatches]
    
    if (isRelevant) {
      logger.info(`✅ AI 相关: ${article.title} (得分: ${relevanceScore}/${threshold}, 匹配关键词: ${allMatches.join(', ')})`)
    } else {
      logger.info(`❌ 非AI相关: ${article.title} (得分: ${relevanceScore}/${threshold}, 匹配关键词: ${allMatches.join(', ')})`)
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
   * 延迟函数 - 添加随机延迟避免被识别为爬虫
   */
  private delay(ms: number): Promise<void> {
    // 添加 ±20% 的随机延迟
    const randomDelay = ms + (Math.random() - 0.5) * 0.4 * ms
    return new Promise(resolve => setTimeout(resolve, Math.max(1000, randomDelay)))
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

  /**
   * 验证图片URL是否有效（爬虫专用）
   */
  private isValidImageUrlForCrawler(url: string): boolean {
    const invalidPatterns = [
      'data:image/svg+xml',
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP',
      'placeholder',
      'loading.gif',
      'spinner.gif',
      't.png',
      'img-placeholder',
      'logo_sspai_icon',
      'thumbnail/!72x72r',
      'thumbnail/!84x84r',
      'qrcode_service',
      'ui/img-placeholder',
      'avatar/',
      'icon.png',
      'logo.png',
      'default-avatar',
      'no-image',
      'blank.gif',
      '1x1.png',
      'transparent.png',
      'cdn-avatars.huggingface.co', // 过滤掉Hugging Face头像
      'papers-by.png', // 过滤掉Papers With Code的logo
      'solidot-s.gif' // 过滤掉Solidot的小图标
    ]

    // 基本URL验证
    if (!url || url.length > 2000 || !/^https?:\/\//i.test(url)) {
      return false
    }

    // 检查无效模式
    if (invalidPatterns.some(pattern => url.includes(pattern))) {
      return false
    }

    // 检查文件扩展名
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url)
    
    // 检查是否是太小的缩略图
    const isTinyThumbnail = /thumbnail\/![0-9]{1,2}x[0-9]{1,2}r/.test(url) ||
                           /w_[0-9]{1,2}[^0-9]/.test(url) ||
                           /h_[0-9]{1,2}[^0-9]/.test(url)

    return hasValidExtension && !isTinyThumbnail
  }
}