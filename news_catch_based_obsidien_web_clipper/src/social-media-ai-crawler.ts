// 社交媒体 AI 新闻爬虫
import { consola } from 'consola'
import { promises as fs } from 'fs'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { SimpleStorageManager } from './storage/simple-storage-manager.js'
import { ImageProcessor } from './utils/image-processor.js'
import { NetworkHelper } from './utils/network-helper.js'
import * as cheerio from 'cheerio'

const logger = consola.withTag('SocialMediaAICrawler')

interface SocialMediaConfig {
  platform: string
  minUpvotes?: number
  minComments?: number
  minViews?: number
  minLikes?: number
  minStars?: number
  minForks?: number
  minClaps?: number
  minShares?: number
  minReadTime?: number
  engagementWeight: number
  preferredChannels?: string[]
  preferredAuthors?: string[]
  preferredLanguages?: string[]
  requireVerified?: boolean
}

interface SocialMediaSource {
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
    author?: string
    engagement?: string
  }
  keywords: string[]
  interval: number
  socialMediaConfig: SocialMediaConfig
}

interface SocialMediaSourcesConfig {
  sources: SocialMediaSource[]
  globalSettings: {
    maxArticlesPerSource: number
    contentMinLength: number
    enableKeywordFiltering: boolean
    keywordMatchThreshold: number
    excludeKeywords: string[]
    userAgent: string
    requestDelay: number
    timeout: number
    socialMediaSettings: {
      enableEngagementFiltering: boolean
      engagementThreshold: number
      maxDailyPosts: number
      respectRateLimit: boolean
      useProxies: boolean
    }
  }
}

interface EngagementMetrics {
  upvotes?: number
  comments?: number
  views?: number
  likes?: number
  shares?: number
  stars?: number
  forks?: number
  claps?: number
  score: number
}

interface SocialMediaArticle {
  url: string
  title: string
  content: string
  author?: string
  publishTime?: Date
  platform: string
  engagement: EngagementMetrics
  tags: string[]
  hash: string
  images?: any[]
}

export class SocialMediaAICrawler {
  private config!: SocialMediaSourcesConfig
  private clipper: WebClipperAdapter
  private storage: SimpleStorageManager
  private imageProcessor: ImageProcessor
  private configPath: string

  constructor(configPath: string = './config/social-media-ai-sources.json') {
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
    logger.success('✅ 社交媒体 AI 新闻爬虫初始化完成')
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(configData)
      logger.info(`📋 加载了 ${this.config.sources.length} 个社交媒体 AI 新闻源`)
    } catch (error: any) {
      logger.error('❌ 社交媒体配置文件加载失败:', error.message)
      throw error
    }
  }

  /**
   * 获取启用的新闻源
   */
  getEnabledSources(): SocialMediaSource[] {
    return this.config.sources.filter(source => source.enabled)
  }

  /**
   * 抓取所有启用的社交媒体 AI 新闻源
   */
  async crawlAllSources(): Promise<{
    totalPosts: number
    savedPosts: number
    sources: { [key: string]: number }
  }> {
    const enabledSources = this.getEnabledSources()
    logger.info(`🚀 开始抓取 ${enabledSources.length} 个社交媒体 AI 新闻源...`)

    let totalPosts = 0
    let savedPosts = 0
    const sourceStats: { [key: string]: number } = {}

    for (const source of enabledSources) {
      try {
        logger.info(`📱 正在处理: ${source.name} (${source.socialMediaConfig.platform})`)
        
        const posts = await this.crawlSocialMediaSource(source)
        totalPosts += posts.length

        // 按互动数据筛选
        const filteredPosts = this.filterByEngagement(posts, source)
        logger.info(`📊 互动筛选: ${posts.length} -> ${filteredPosts.length} 条`)

        // 保存文章
        for (const post of filteredPosts) {
          try {
            await this.storage.saveArticle(this.convertToArticle(post))
            savedPosts++
          } catch (error: any) {
            if (!error.message.includes('已存在')) {
              logger.warn(`⚠️ 保存文章失败: ${post.title}`, error.message)
            }
          }
        }

        sourceStats[source.name] = filteredPosts.length
        logger.success(`✅ ${source.name}: 发现 ${posts.length} 条，筛选后 ${filteredPosts.length} 条`)

        // 尊重平台限制，增加延迟
        const platformDelay = this.getPlatformDelay(source.socialMediaConfig.platform)
        await this.delay(platformDelay)

      } catch (error: any) {
        logger.error(`❌ 处理失败: ${source.name}`, error.message)
        sourceStats[source.name] = 0
      }
    }

    logger.success(`🎉 社交媒体抓取完成: 总计 ${totalPosts} 条，保存 ${savedPosts} 条`)
    return { totalPosts, savedPosts, sources: sourceStats }
  }

  /**
   * 抓取单个社交媒体新闻源
   */
  private async crawlSocialMediaSource(source: SocialMediaSource): Promise<SocialMediaArticle[]> {
    const posts: SocialMediaArticle[] = []
    const maxPosts = this.config.globalSettings.maxArticlesPerSource

    // 1. 首先尝试从RSS获取
    if (source.rssUrls && source.rssUrls.length > 0) {
      try {
        logger.info(`📡 尝试从RSS获取帖子: ${source.name}`)
        const rssPosts = await this.extractFromRSS(source)
        posts.push(...rssPosts)
        logger.info(`✅ 从RSS获取到 ${rssPosts.length} 条帖子`)
      } catch (error: any) {
        logger.warn(`⚠️ RSS抓取失败: ${source.name}`, error.message)
      }
    }

    // 2. 从首页和搜索结果获取
    if (posts.length < maxPosts) {
      try {
        logger.info(`🔍 尝试从搜索结果获取帖子: ${source.name}`)
        const searchPosts = await this.extractFromSearch(source)
        const newPosts = searchPosts.filter(
          searchPost => !posts.some(existingPost => existingPost.url === searchPost.url)
        )
        posts.push(...newPosts)
        logger.info(`✅ 从搜索结果获取到 ${newPosts.length} 条新帖子`)
      } catch (error: any) {
        logger.warn(`⚠️ 搜索结果抓取失败: ${source.name}`, error.message)
      }
    }

    // 3. 对帖子进行AI相关性评分
    const aiRelevantPosts = posts.filter(post => this.isAIRelevant(post, source))
    logger.info(`🤖 AI相关性筛选: ${posts.length} -> ${aiRelevantPosts.length} 条`)

    return aiRelevantPosts.slice(0, maxPosts)
  }

  /**
   * 从RSS源提取内容
   */
  private async extractFromRSS(source: SocialMediaSource): Promise<SocialMediaArticle[]> {
    const posts: SocialMediaArticle[] = []
    
    for (const rssUrl of source.rssUrls || []) {
      try {
        const response = await fetch(rssUrl, {
          headers: { 'User-Agent': this.config.globalSettings.userAgent }
        })
        const rssText = await response.text()
        
        // 简单的RSS解析（可以用rss-parser库替代）
        const $ = cheerio.load(rssText, { xmlMode: true })
        
        $('item, entry').each((_, el) => {
          const $item = $(el)
          const title = $item.find('title').text().trim()
          const link = $item.find('link').text().trim() || $item.find('link').attr('href')
          const description = $item.find('description, summary').text().trim()
          const pubDate = $item.find('pubDate, published').text().trim()
          
          if (title && link) {
            posts.push({
              url: link,
              title,
              content: description,
              publishTime: pubDate ? new Date(pubDate) : new Date(),
              platform: source.socialMediaConfig.platform,
              engagement: { score: 0 },
              tags: source.tags,
              hash: this.generateHash(link + title)
            })
          }
        })
      } catch (error: any) {
        logger.warn(`⚠️ RSS解析失败: ${rssUrl}`, error.message)
      }
    }
    
    return posts
  }

  /**
   * 从搜索结果提取内容
   */
  private async extractFromSearch(source: SocialMediaSource): Promise<SocialMediaArticle[]> {
    const posts: SocialMediaArticle[] = []
    
    for (const searchUrl of source.searchUrls) {
      try {
        await this.delay(this.config.globalSettings.requestDelay)
        
        const response = await fetch(searchUrl, {
          headers: { 
            'User-Agent': this.config.globalSettings.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: this.config.globalSettings.timeout
        })
        
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // 根据平台特定的选择器提取内容
        const extractedPosts = await this.extractPostsByPlatform($, source, searchUrl)
        posts.push(...extractedPosts)
        
      } catch (error: any) {
        logger.warn(`⚠️ 搜索结果抓取失败: ${searchUrl}`, error.message)
      }
    }
    
    return posts
  }

  /**
   * 根据平台提取帖子
   */
  private async extractPostsByPlatform(
    $: cheerio.CheerioAPI, 
    source: SocialMediaSource, 
    baseUrl: string
  ): Promise<SocialMediaArticle[]> {
    const posts: SocialMediaArticle[] = []
    
    switch (source.socialMediaConfig.platform) {
      case 'reddit':
        posts.push(...this.extractRedditPosts($, source, baseUrl))
        break
      case 'youtube':
        posts.push(...this.extractYouTubePosts($, source, baseUrl))
        break
      case 'github':
        posts.push(...this.extractGitHubPosts($, source, baseUrl))
        break
      case 'medium':
        posts.push(...this.extractMediumPosts($, source, baseUrl))
        break
      case 'linkedin':
        posts.push(...this.extractLinkedInPosts($, source, baseUrl))
        break
      default:
        logger.warn(`⚠️ 未支持的平台: ${source.socialMediaConfig.platform}`)
    }
    
    return posts
  }

  /**
   * 提取Reddit帖子
   */
  private extractRedditPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    $(source.selectors.articleLinks).each((_, el) => {
      try {
        const $el = $(el)
        const $post = $el.closest('[data-testid="post-content"], .thing')
        
        const title = $post.find(source.selectors.title).text().trim()
        const url = $el.attr('href') || ''
        const content = $post.find(source.selectors.content).text().trim()
        const author = $post.find(source.selectors.author || '').text().trim()
        const upvotes = this.parseNumber($post.find('[data-testid="upvote-button"], .score').text())
        const comments = this.parseNumber($post.find('[data-testid="comment-button"], .comments').text())
        
        if (title && url) {
          posts.push({
            url: url.startsWith('http') ? url : `https://www.reddit.com${url}`,
            title,
            content,
            author,
            platform: 'reddit',
            engagement: {
              upvotes,
              comments,
              score: upvotes * 1 + comments * 0.5
            },
            tags: source.tags,
            hash: this.generateHash(url + title)
          })
        }
      } catch (error: any) {
        logger.debug(`⚠️ Reddit帖子解析失败:`, error.message)
      }
    })
    
    return posts
  }

  /**
   * 提取YouTube视频
   */
  private extractYouTubePosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    $(source.selectors.articleLinks).each((_, el) => {
      try {
        const $el = $(el)
        const $video = $el.closest('ytd-video-renderer, .ytd-item-section-renderer')
        
        const title = $video.find(source.selectors.title).text().trim()
        const url = $el.attr('href') || ''
        const author = $video.find(source.selectors.author || '').text().trim()
        const views = this.parseNumber($video.find('.view-count, #metadata-line span').text())
        
        if (title && url) {
          posts.push({
            url: url.startsWith('http') ? url : `https://www.youtube.com${url}`,
            title,
            content: `YouTube视频 - ${author}`,
            author,
            platform: 'youtube',
            engagement: {
              views,
              score: views * 0.001
            },
            tags: source.tags,
            hash: this.generateHash(url + title)
          })
        }
      } catch (error: any) {
        logger.debug(`⚠️ YouTube视频解析失败:`, error.message)
      }
    })
    
    return posts
  }

  /**
   * 提取GitHub项目
   */
  private extractGitHubPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    $(source.selectors.articleLinks).each((_, el) => {
      try {
        const $el = $(el)
        const $repo = $el.closest('.Box-row, .repo-list-item')
        
        const title = $el.text().trim()
        const url = $el.attr('href') || ''
        const description = $repo.find('p, .repo-list-description').text().trim()
        const author = $repo.find('.text-normal a, .repo-list-name a').first().text().trim()
        const stars = this.parseNumber($repo.find('[aria-label*="star"], .octicon-star').parent().text())
        const forks = this.parseNumber($repo.find('[aria-label*="fork"], .octicon-repo-forked').parent().text())
        
        if (title && url) {
          posts.push({
            url: url.startsWith('http') ? url : `https://github.com${url}`,
            title,
            content: description,
            author,
            platform: 'github',
            engagement: {
              stars,
              forks,
              score: stars * 1 + forks * 0.5
            },
            tags: source.tags,
            hash: this.generateHash(url + title)
          })
        }
      } catch (error: any) {
        logger.debug(`⚠️ GitHub项目解析失败:`, error.message)
      }
    })
    
    return posts
  }

  /**
   * 提取Medium文章
   */
  private extractMediumPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    $(source.selectors.articleLinks).each((_, el) => {
      try {
        const $el = $(el)
        const $article = $el.closest('article, .postArticle')
        
        const title = $el.text().trim()
        const url = $el.attr('href') || ''
        const author = $article.find('a[rel="author"], .postMetaInline a').first().text().trim()
        const claps = this.parseNumber($article.find('.multirecommend-count, button span').text())
        
        if (title && url) {
          posts.push({
            url: url.startsWith('http') ? url : `https://medium.com${url}`,
            title,
            content: `Medium文章 - ${author}`,
            author,
            platform: 'medium',
            engagement: {
              claps,
              score: claps * 0.1
            },
            tags: source.tags,
            hash: this.generateHash(url + title)
          })
        }
      } catch (error: any) {
        logger.debug(`⚠️ Medium文章解析失败:`, error.message)
      }
    })
    
    return posts
  }

  /**
   * 提取LinkedIn帖子
   */
  private extractLinkedInPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    $('.feed-shared-update-v2').each((_, el) => {
      try {
        const $el = $(el)
        const title = $el.find('.update-components-text span span').first().text().trim()
        const content = $el.find('.update-components-text').text().trim()
        const author = $el.find('.update-components-actor__name').text().trim()
        const likes = this.parseNumber($el.find('.social-counts-reactions span').text())
        
        if (title) {
          posts.push({
            url: baseUrl,
            title,
            content,
            author,
            platform: 'linkedin',
            engagement: {
              likes,
              score: likes * 0.2
            },
            tags: source.tags,
            hash: this.generateHash(content + title)
          })
        }
      } catch (error: any) {
        logger.debug(`⚠️ LinkedIn帖子解析失败:`, error.message)
      }
    })
    
    return posts
  }

  /**
   * 根据互动数据筛选帖子
   */
  private filterByEngagement(posts: SocialMediaArticle[], source: SocialMediaSource): SocialMediaArticle[] {
    if (!this.config.globalSettings.socialMediaSettings.enableEngagementFiltering) {
      return posts
    }

    const config = source.socialMediaConfig
    
    return posts.filter(post => {
      const engagement = post.engagement
      
      // 根据平台检查最小互动要求
      if (config.minUpvotes && (!engagement.upvotes || engagement.upvotes < config.minUpvotes)) return false
      if (config.minComments && (!engagement.comments || engagement.comments < config.minComments)) return false
      if (config.minViews && (!engagement.views || engagement.views < config.minViews)) return false
      if (config.minLikes && (!engagement.likes || engagement.likes < config.minLikes)) return false
      if (config.minStars && (!engagement.stars || engagement.stars < config.minStars)) return false
      if (config.minClaps && (!engagement.claps || engagement.claps < config.minClaps)) return false
      
      // 检查综合得分
      const threshold = this.config.globalSettings.socialMediaSettings.engagementThreshold
      return engagement.score >= threshold
    })
  }

  /**
   * 检查是否AI相关
   */
  private isAIRelevant(post: SocialMediaArticle, source: SocialMediaSource): boolean {
    if (!this.config.globalSettings.enableKeywordFiltering) {
      return true
    }

    const content = `${post.title} ${post.content}`.toLowerCase()
    const keywords = source.keywords.map(k => k.toLowerCase())
    
    let matches = 0
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matches++
      }
    }
    
    return matches >= this.config.globalSettings.keywordMatchThreshold
  }

  /**
   * 转换为通用文章格式
   */
  private convertToArticle(post: SocialMediaArticle): any {
    return {
      title: post.title,
      content: post.content,
      url: post.url,
      publishTime: post.publishTime || new Date(),
      source: `${post.platform}-ai`,
      author: post.author,
      tags: post.tags,
      hash: post.hash,
      images: post.images || [],
      extra: {
        platform: post.platform,
        engagement: post.engagement,
        socialMedia: true
      }
    }
  }

  /**
   * 获取平台特定延迟
   */
  private getPlatformDelay(platform: string): number {
    const delays = {
      reddit: 3000,
      youtube: 5000,
      github: 2000,
      medium: 4000,
      linkedin: 8000,
      twitter: 10000
    }
    return delays[platform as keyof typeof delays] || 5000
  }

  /**
   * 解析数字字符串
   */
  private parseNumber(text: string): number {
    if (!text) return 0
    const match = text.match(/[\d,.]+/)
    if (!match) return 0
    
    let numStr = match[0].replace(/,/g, '')
    let multiplier = 1
    
    if (text.toLowerCase().includes('k')) multiplier = 1000
    else if (text.toLowerCase().includes('m')) multiplier = 1000000
    
    return Math.floor(parseFloat(numStr) * multiplier)
  }

  /**
   * 生成内容哈希
   */
  private generateHash(content: string): string {
    return Buffer.from(content).toString('base64').substring(0, 16)
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
    return await this.storage.getStats()
  }
}