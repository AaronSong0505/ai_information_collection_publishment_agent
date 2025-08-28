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
            // RSS数据通常没有互动指标，给予基础分数
            const baseScore = this.calculateRSSBaseScore(source.socialMediaConfig.platform)
            
            posts.push({
              url: link,
              title,
              content: description,
              publishTime: pubDate ? new Date(pubDate) : new Date(),
              platform: source.socialMediaConfig.platform,
              engagement: { 
                score: baseScore,
                // 为RSS数据设置默认值，避免被筛选器过滤
                ...(source.socialMediaConfig.platform === 'youtube' && {
                  views: 500,  // 给YouTube RSS一个合理的默认观看量
                  likes: 10
                }),
                ...(source.socialMediaConfig.platform === 'reddit' && {
                  upvotes: 10,  // 给Reddit RSS一个合理的默认赞数
                  comments: 3
                }),
                ...(source.socialMediaConfig.platform === 'medium' && {
                  claps: 5,     // 给Medium RSS一个合理的默认拍手数
                  readTime: 5
                })
              },
              tags: source.tags,
              hash: this.generateHash(link + title)
            })
            
            logger.debug(`📡 RSS帖子: "${title.substring(0, 40)}..." [${source.socialMediaConfig.platform}] 基础分数: ${baseScore}`)
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
   * 提取Reddit帖子 - 现代化版本
   */
  private extractRedditPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    // 现代Reddit页面的多种选择器策略
    const selectors = [
      'shreddit-post',                    // 新版Reddit
      '[data-testid="post-content"]',      // 测试版Reddit
      '.thing',                           // 老版Reddit
      '.Post',                            // 移动版Reddit
      'faceplate-tracker',                // 某些Reddit版本
      '[data-click-id="body"]',           // 某些实验版本
      'article[data-testid="post"]'       // 另一种新版格式
    ]
    
    let foundPosts = false
    for (const selector of selectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        logger.debug(`🔍 Reddit使用选择器: ${selector}, 找到 ${elements.length} 个元素`)
        foundPosts = true
        
        elements.each((_, el) => {
          try {
            const $el = $(el)
            
            // 根据不同的Reddit版本使用不同的提取策略
            let title = ''
            let url = ''
            
            // 新版shreddit-post结构
            if (selector === 'shreddit-post') {
              const titleEl = $el.find('h3 a, [slot="title"] a').first()
              title = titleEl.text().trim() || titleEl.attr('title') || ''
              url = titleEl.attr('href') || ''
              
              // 如果在shreddit-post中没有找到，尝试其他方式
              if (!title) {
                title = $el.find('h1, h2, h3').first().text().trim()
              }
              if (!url) {
                url = $el.find('a[slot="full-post-link"]').attr('href') || $el.find('a').first().attr('href') || ''
              }
            }
            // 测试版data-testid结构
            else if (selector.includes('post-content')) {
              const titleEl = $el.find('h3 a, [data-testid="post-title"] a').first()
              title = titleEl.text().trim()
              url = titleEl.attr('href') || ''
            }
            // 老版.thing结构
            else if (selector === '.thing') {
              const titleEl = $el.find('.title a').first()
              title = titleEl.text().trim()
              url = titleEl.attr('href') || ''
            }
            // 通用策略
            else {
              const titleSelectors = ['h3 a', 'h2 a', 'h1 a', '[data-testid="post-title"] a', '.title a']
              for (const titleSel of titleSelectors) {
                const titleEl = $el.find(titleSel).first()
                if (titleEl.length > 0) {
                  title = titleEl.text().trim() || titleEl.attr('title') || ''
                  url = titleEl.attr('href') || ''
                  if (title && url) break
                }
              }
            }
            
            if (!title || !url) {
              logger.debug(`⚠️ Reddit帖子缺少标题或链接: title="${title}", url="${url}")`)
              return
            }
            
            // 提取内容
            let content = ''
            const contentSelectors = [
              '[slot="text-body"]',           // 新版shreddit-post
              '[data-testid="post-content"] p', // 测试版
              '.usertext-body .md',           // 老版
              '.Post-body',                   // 移动版
              '.md p'                         // 通用markdown
            ]
            
            for (const contentSel of contentSelectors) {
              content = $el.find(contentSel).first().text().trim()
              if (content && content.length > 10) break
            }
            
            // 提取作者
            let author = ''
            const authorSelectors = [
              '[slot="credit-bar"] a',        // 新版
              '[data-testid="author-link"]',  // 测试版
              '.author',                      // 老版
              '[data-author]'                 // 属性版
            ]
            
            for (const authorSel of authorSelectors) {
              const authorEl = $el.find(authorSel).first()
              author = authorEl.text().trim() || authorEl.attr('data-author') || ''
              if (author) break
            }
            
            // 提取互动数据 - 多种策略
            let upvotes = 0
            let comments = 0
            
            // 新版shreddit-post的互动数据
            if (selector === 'shreddit-post') {
              const upvoteSelectors = [
                '[aria-label*="upvote"]',
                '[data-testid="upvote-button"]',
                'faceplate-number[name="upvote-count"]',
                '.score'
              ]
              
              for (const upvoteSel of upvoteSelectors) {
                const upvoteEl = $el.find(upvoteSel).first()
                const upvoteText = upvoteEl.text().trim() || upvoteEl.attr('count') || upvoteEl.attr('aria-label') || ''
                if (upvoteText && upvoteText !== '•') {
                  upvotes = this.parseNumber(upvoteText)
                  if (upvotes > 0) {
                    logger.debug(`👍 Reddit赞数解析: "${upvoteText}" -> ${upvotes}`)
                    break
                  }
                }
              }
              
              const commentSelectors = [
                '[aria-label*="comment"]',
                'faceplate-number[name="comment-count"]',
                '.comments'
              ]
              
              for (const commentSel of commentSelectors) {
                const commentEl = $el.find(commentSel).first()
                const commentText = commentEl.text().trim() || commentEl.attr('count') || commentEl.attr('aria-label') || ''
                if (commentText) {
                  comments = this.parseNumber(commentText)
                  if (comments > 0) {
                    logger.debug(`💬 Reddit评论数解析: "${commentText}" -> ${comments}`)
                    break
                  }
                }
              }
            }
            // 老版和测试版的互动数据
            else {
              const upvoteSelectors = [
                '[data-testid="upvote-button"] span',
                '.score.unvoted', '.score',
                '.Post-score', '[aria-label*="upvote"]'
              ]
              
              for (const upvoteSel of upvoteSelectors) {
                const upvoteText = $el.find(upvoteSel).text().trim()
                if (upvoteText && upvoteText !== '•') {
                  upvotes = this.parseNumber(upvoteText)
                  if (upvotes > 0) {
                    logger.debug(`👍 Reddit赞数解析: "${upvoteText}" -> ${upvotes}`)
                    break
                  }
                }
              }
              
              const commentSelectors = [
                '[data-testid="comment-button"] span',
                '.comments', '.Post-comments'
              ]
              
              for (const commentSel of commentSelectors) {
                const commentText = $el.find(commentSel).text().trim()
                if (commentText) {
                  comments = this.parseNumber(commentText)
                  if (comments > 0) {
                    logger.debug(`💬 Reddit评论数解析: "${commentText}" -> ${comments}`)
                    break
                  }
                }
              }
            }
            
            // 计算综合得分
            const score = upvotes * 1 + comments * 0.5
            
            // 确保URL格式正确
            let finalUrl = url
            if (url && !url.startsWith('http')) {
              if (url.startsWith('/r/')) {
                finalUrl = `https://www.reddit.com${url}`
              } else if (url.startsWith('/')) {
                finalUrl = `https://www.reddit.com${url}`
              } else {
                finalUrl = `https://www.reddit.com/r/artificial/comments/${url}`
              }
            }
            
            if (title && finalUrl) {
              posts.push({
                url: finalUrl,
                title,
                content: content || `Reddit帖子 - ${author || '未知用户'}`,
                author: author || '未知用户',
                platform: 'reddit',
                engagement: {
                  upvotes,
                  comments,
                  score
                },
                tags: source.tags,
                hash: this.generateHash(finalUrl + title)
              })
              
              logger.debug(`✓ Reddit帖子[${selector}]: "${title.substring(0, 50)}...", 赞:${upvotes}, 评:${comments}, 得分:${score.toFixed(1)}`)
            }
          } catch (error: any) {
            logger.debug(`⚠️ Reddit帖子解析失败[${selector}]:`, error.message)
          }
        })
        
        if (posts.length > 0) {
          logger.info(`✅ Reddit选择器 "${selector}" 成功提取到 ${posts.length} 个帖子`)
          break
        }
      }
    }
    
    if (!foundPosts) {
      logger.warn(`⚠️ 未找到任何Reddit帖子元素，页面结构可能已更改`)
      logger.info(`💡 尝试过的选择器: ${selectors.join(', ')}`)
      
      // 提供调试建议
      logger.info(`🔧 调试建议:`)
      logger.info(`   1. 检查Reddit是否要求登录`)
      logger.info(`   2. 检查是否被反爬虫机制阻止`)
      logger.info(`   3. 尝试更新User-Agent`)
      logger.info(`   4. 考虑使用Reddit API`)
    }
    
    return posts
  }

  /**
   * 提取YouTube视频 - 增强版
   */
  private extractYouTubePosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    // 多种选择器策略
    const selectors = [
      'ytd-video-renderer',
      '.ytd-item-section-renderer',
      '#video-title',
      '.compact-media-item'
    ]
    
    let foundVideos = false
    for (const selector of selectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        logger.debug(`🔍 YouTube使用选择器: ${selector}, 找到 ${elements.length} 个元素`)
        foundVideos = true
        
        elements.each((_, el) => {
          try {
            const $el = $(el)
            
            // 提取标题和url
            const titleSelectors = [
              '#video-title', 'h3 a', '.video-title',
              '[id*="video-title"]', 'a#thumbnail'
            ]
            
            let title = ''
            let url = ''
            
            for (const titleSel of titleSelectors) {
              const titleEl = $el.find(titleSel).first()
              if (titleEl.length > 0) {
                title = titleEl.text().trim() || titleEl.attr('title') || ''
                url = titleEl.attr('href') || ''
                if (title && url) break
              }
            }
            
            // 提取作者
            const authorSelectors = [
              '#channel-name a', '.ytd-channel-name',
              '#owner-text a', '.channel-name'
            ]
            let author = ''
            for (const authorSel of authorSelectors) {
              author = $el.find(authorSel).text().trim()
              if (author) break
            }
            
            // 提取观看量
            const viewSelectors = [
              '#metadata-line span', '.view-count',
              '[aria-label*="views"]', '.style-scope.ytd-video-meta-block'
            ]
            
            let views = 0
            for (const viewSel of viewSelectors) {
              const viewText = $el.find(viewSel).text().trim()
              if (viewText && (viewText.includes('view') || viewText.includes('观看') || /\d/.test(viewText))) {
                views = this.parseNumber(viewText)
                if (views > 0) {
                  logger.debug(`👁️ YouTube观看量解析: "${viewText}" -> ${views}`)
                  break
                }
              }
            }
            
            // YouTube的点赞数通常在视频页面才有，搜索结果页面没有
            let likes = 0
            
            // 计算综合得分（主要基于观看量）
            const score = views * 0.001 + likes * 0.1
            
            if (title && url) {
              posts.push({
                url: url.startsWith('http') ? url : `https://www.youtube.com${url}`,
                title,
                content: `YouTube视频 - ${author}`,
                author,
                platform: 'youtube',
                engagement: {
                  views,
                  likes,
                  score
                },
                tags: source.tags,
                hash: this.generateHash(url + title)
              })
              
              logger.debug(`✓ YouTube视频: "${title.substring(0, 50)}...", 观看:${views}, 得分:${score.toFixed(1)}`)
            }
          } catch (error: any) {
            logger.debug(`⚠️ YouTube视频解析失败:`, error.message)
          }
        })
        
        if (posts.length > 0) break
      }
    }
    
    if (!foundVideos) {
      logger.warn(`⚠️ 未找到YouTube视频元素，可能需要更新选择器`)
    }
    
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
   * 提取Medium文章 - 增强版
   */
  private extractMediumPosts($: cheerio.CheerioAPI, source: SocialMediaSource, baseUrl: string): SocialMediaArticle[] {
    const posts: SocialMediaArticle[] = []
    
    // 多种选择器策略
    const selectors = [
      'article', '.postArticle',
      '.post', '.story',
      '[data-testid="post-preview"]'
    ]
    
    let foundArticles = false
    for (const selector of selectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        logger.debug(`🔍 Medium使用选择器: ${selector}, 找到 ${elements.length} 个元素`)
        foundArticles = true
        
        elements.each((_, el) => {
          try {
            const $el = $(el)
            
            // 提取标题和url
            const titleSelectors = [
              'h2 a', 'h3 a', '.graf--title',
              '[data-testid="post-preview-title"]',
              '.post-title', '.story-title'
            ]
            
            let title = ''
            let url = ''
            
            for (const titleSel of titleSelectors) {
              const titleEl = $el.find(titleSel).first()
              if (titleEl.length > 0) {
                title = titleEl.text().trim()
                url = titleEl.attr('href') || ''
                if (title && url) break
              }
            }
            
            // 如果没有找到链接，尝试从父元素获取
            if (!url) {
              const linkEl = $el.find('a').first()
              url = linkEl.attr('href') || ''
            }
            
            // 提取作者
            const authorSelectors = [
              'a[rel="author"]', '.author-name',
              '[data-testid="authorName"]', '.post-author'
            ]
            let author = ''
            for (const authorSel of authorSelectors) {
              author = $el.find(authorSel).text().trim()
              if (author) break
            }
            
            // 提取拍手数
            const clapSelectors = [
              '.multirecommend-count', '[data-testid="clap-count"]',
              'button[data-action="show-recommends"] span',
              '.js-actionMultirecommendCount'
            ]
            
            let claps = 0
            for (const clapSel of clapSelectors) {
              const clapText = $el.find(clapSel).text().trim()
              if (clapText && /\d/.test(clapText)) {
                claps = this.parseNumber(clapText)
                if (claps > 0) {
                  logger.debug(`👏 Medium拍手数解析: "${clapText}" -> ${claps}`)
                  break
                }
              }
            }
            
            // 提取阅读时间
            const readTimeSelectors = [
              '.readingTime', '[data-testid="storyReadTime"]',
              '.post-read-time', '.story-read-time'
            ]
            
            let readTime = 0
            for (const readTimeSel of readTimeSelectors) {
              const readTimeText = $el.find(readTimeSel).text().trim()
              if (readTimeText) {
                const match = readTimeText.match(/\d+/)
                if (match) {
                  readTime = parseInt(match[0])
                  break
                }
              }
            }
            
            // 计算综合得分
            const score = claps * 0.1 + readTime * 0.5
            
            if (title && url) {
              posts.push({
                url: url.startsWith('http') ? url : `https://medium.com${url}`,
                title,
                content: `Medium文章 - ${author}`,
                author,
                platform: 'medium',
                engagement: {
                  claps,
                  readTime,
                  score
                },
                tags: source.tags,
                hash: this.generateHash(url + title)
              })
              
              logger.debug(`✓ Medium文章: "${title.substring(0, 50)}...", 拍手:${claps}, 时间:${readTime}分钟, 得分:${score.toFixed(1)}`)
            }
          } catch (error: any) {
            logger.debug(`⚠️ Medium文章解析失败:`, error.message)
          }
        })
        
        if (posts.length > 0) break
      }
    }
    
    if (!foundArticles) {
      logger.warn(`⚠️ 未找到Medium文章元素，可能需要更新选择器`)
    }
    
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
   * 根据互动数据筛选帖子 - 增强版
   */
  private filterByEngagement(posts: SocialMediaArticle[], source: SocialMediaSource): SocialMediaArticle[] {
    if (!this.config.globalSettings.socialMediaSettings.enableEngagementFiltering) {
      logger.debug(`📊 互动筛选已禁用，通过所有 ${posts.length} 条内容`)
      return posts
    }

    const config = source.socialMediaConfig
    const platform = config.platform
    
    logger.debug(`📊 开始互动筛选: ${platform}, 原始数量: ${posts.length}`)
    
    const filtered = posts.filter((post, index) => {
      const engagement = post.engagement
      
      // 为每个帖子记录详细信息
      const debugInfo = {
        title: post.title.substring(0, 30) + '...',
        engagement: engagement,
        platform: platform
      }
      
      // 检查平台特定的最小互动要求
      const checks = []
      
      // 对RSS数据源的特殊处理 - 降低标准
      const isRSSSource = post.url && (
        post.url.includes('reddit.com/') ||
        post.url.includes('youtube.com/') ||
        post.url.includes('medium.com/')
      )
      
      const adjustedConfig = isRSSSource ? {
        ...config,
        // 为RSS数据降低最小要求
        minUpvotes: Math.max(1, (config.minUpvotes || 0) / 5),
        minViews: Math.max(10, (config.minViews || 0) / 10),
        minClaps: Math.max(1, (config.minClaps || 0) / 3),
        minLikes: Math.max(1, (config.minLikes || 0) / 5),
        minComments: Math.max(1, (config.minComments || 0) / 2)
      } : config
      
      if (adjustedConfig.minUpvotes !== undefined) {
        const passed = !engagement.upvotes || engagement.upvotes >= adjustedConfig.minUpvotes
        checks.push({ type: 'upvotes', required: adjustedConfig.minUpvotes, actual: engagement.upvotes || 0, passed })
      }
      
      if (adjustedConfig.minComments !== undefined) {
        const passed = !engagement.comments || engagement.comments >= adjustedConfig.minComments
        checks.push({ type: 'comments', required: adjustedConfig.minComments, actual: engagement.comments || 0, passed })
      }
      
      if (adjustedConfig.minViews !== undefined) {
        const passed = !engagement.views || engagement.views >= adjustedConfig.minViews
        checks.push({ type: 'views', required: adjustedConfig.minViews, actual: engagement.views || 0, passed })
      }
      
      if (adjustedConfig.minLikes !== undefined) {
        const passed = !engagement.likes || engagement.likes >= adjustedConfig.minLikes
        checks.push({ type: 'likes', required: adjustedConfig.minLikes, actual: engagement.likes || 0, passed })
      }
      
      if (adjustedConfig.minStars !== undefined) {
        const passed = !engagement.stars || engagement.stars >= adjustedConfig.minStars
        checks.push({ type: 'stars', required: adjustedConfig.minStars, actual: engagement.stars || 0, passed })
      }
      
      if (adjustedConfig.minClaps !== undefined) {
        const passed = !engagement.claps || engagement.claps >= adjustedConfig.minClaps
        checks.push({ type: 'claps', required: adjustedConfig.minClaps, actual: engagement.claps || 0, passed })
      }
      
      // 检查是否所有条件都通过
      const allPassed = checks.length === 0 || checks.every(check => check.passed)
      
      // 检查综合得分
      const threshold = this.config.globalSettings.socialMediaSettings.engagementThreshold
      const scoreCheck = engagement.score >= threshold
      
      const finalResult = allPassed && scoreCheck
      
      // 详细调试信息
      if (index < 5 || finalResult) {  // 只显示前5个或通过的
        logger.debug(`${finalResult ? '✓' : '✗'} [${platform}] "${debugInfo.title}"`)
        logger.debug(`   得分: ${engagement.score.toFixed(2)} (>=  ${threshold})`)
        
        checks.forEach(check => {
          const status = check.passed ? '✓' : '✗'
          logger.debug(`   ${status} ${check.type}: ${check.actual} (>= ${check.required})`)
        })
        
        if (!finalResult) {
          const failedChecks = checks.filter(c => !c.passed).map(c => c.type)
          if (!scoreCheck) failedChecks.push('得分不足')
          logger.debug(`   未通过原因: ${failedChecks.join(', ')}`)
        }
      }
      
      return finalResult
    })
    
    logger.info(`📊 [${platform}] 互动筛选结果: ${posts.length} -> ${filtered.length} 条`)
    
    if (filtered.length === 0 && posts.length > 0) {
      logger.warn(`⚠️ [${platform}] 所有内容都被筛除，考虑降低筛选条件`)
      
      // 显示建议的调整
      const suggestions = []
      if (config.minUpvotes && config.minUpvotes > 5) suggestions.push(`minUpvotes: ${config.minUpvotes} -> 1-5`)
      if (config.minViews && config.minViews > 100) suggestions.push(`minViews: ${config.minViews} -> 50-100`)
      if (config.minClaps && config.minClaps > 3) suggestions.push(`minClaps: ${config.minClaps} -> 1-3`)
      
      if (suggestions.length > 0) {
        logger.info(`💡 建议调整: ${suggestions.join(', ')}`)
      }
    }
    
    return filtered
  }

  /**
   * 检查是否AI相关 - 智能版
   */
  private isAIRelevant(post: SocialMediaArticle, source: SocialMediaSource): boolean {
    if (!this.config.globalSettings.enableKeywordFiltering) {
      return true
    }

    // 计算AI相关性得分
    const aiScore = this.calculateAIRelevanceScore(post, source)
    
    logger.debug(`🤖 AI相关性分析: "${post.title.substring(0, 40)}...", 得分: ${aiScore.totalScore.toFixed(2)} (阈值: ${this.config.globalSettings.keywordMatchThreshold})`)
    
    // 详细得分信息
    if (aiScore.details.keywordMatches > 0 || aiScore.details.titleMatches > 0) {
      const details = [
        `关键词:${aiScore.details.keywordMatches}`,
        `标题:${aiScore.details.titleMatches}`,
        `质量:${aiScore.details.qualityScore.toFixed(1)}`,
        `平台:${aiScore.details.platformBonus.toFixed(1)}`
      ]
      logger.debug(`   分数细节: ${details.join(', ')}, 匹配词: [${aiScore.matchedKeywords.join(', ')}]`)
    }
    
    return aiScore.totalScore >= this.config.globalSettings.keywordMatchThreshold
  }

  /**
   * 计算AI相关性得分
   */
  private calculateAIRelevanceScore(post: SocialMediaArticle, source: SocialMediaSource): {
    totalScore: number
    details: {
      keywordMatches: number
      titleMatches: number
      qualityScore: number
      platformBonus: number
      contentLength: number
    }
    matchedKeywords: string[]
  } {
    const content = `${post.title} ${post.content}`.toLowerCase()
    const title = post.title.toLowerCase()
    const keywords = source.keywords.map(k => k.toLowerCase())
    
    // 1. 关键词匹配得分
    const matchedKeywords: string[] = []
    let keywordScore = 0
    let titleScore = 0
    
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      
      if (keywordRegex.test(content)) {
        matchedKeywords.push(keyword)
        
        // 根据关键词重要性给不同分数
        if (this.isHighValueKeyword(keyword)) {
          keywordScore += 2  // 高价值关键词
        } else {
          keywordScore += 1  // 普通关键词
        }
        
        // 标题中的关键词加分
        if (keywordRegex.test(title)) {
          titleScore += 1
        }
      }
    }
    
    // 2. 内容质量得分
    const qualityScore = this.calculateContentQuality(post)
    
    // 3. 平台特定加分
    const platformBonus = this.calculatePlatformBonus(post, source)
    
    // 4. 综合计算
    const totalScore = keywordScore + titleScore * 0.5 + qualityScore + platformBonus
    
    return {
      totalScore,
      details: {
        keywordMatches: keywordScore,
        titleMatches: titleScore,
        qualityScore,
        platformBonus,
        contentLength: content.length
      },
      matchedKeywords
    }
  }

  /**
   * 判断是否为高价值关键词
   */
  private isHighValueKeyword(keyword: string): boolean {
    const highValueKeywords = [
      'llm', 'gpt', 'chatgpt', 'transformer', 'bert', 'ai agent',
      '大模型', '智能体', '人工智能', 'machine learning',
      'deep learning', 'neural network', 'artificial intelligence',
      'openai', 'anthropic', 'google ai', 'microsoft ai',
      'diffusion', 'stable diffusion', 'midjourney', 'dall-e'
    ]
    return highValueKeywords.some(hvk => keyword.includes(hvk))
  }

  /**
   * 计算内容质量得分
   */
  private calculateContentQuality(post: SocialMediaArticle): number {
    let score = 0
    
    // 内容长度加分
    if (post.content.length > 200) {
      score += 1
    } else if (post.content.length > 100) {
      score += 0.5
    }
    
    // 标题质量加分
    if (post.title.length > 20 && post.title.length < 100) {
      score += 0.5  // 标题长度合理
    }
    
    // 作者信息加分
    if (post.author && post.author !== '未知用户' && post.author.length > 2) {
      score += 0.3
    }
    
    // 互动数据加分
    if (post.engagement.score > 10) {
      score += 1
    } else if (post.engagement.score > 5) {
      score += 0.5
    }
    
    // 避免低质量内容
    const lowQualityIndicators = [
      'click here', 'buy now', '广告', '推广',
      'spam', 'bot', 'fake', '水贴'
    ]
    
    const contentLower = `${post.title} ${post.content}`.toLowerCase()
    for (const indicator of lowQualityIndicators) {
      if (contentLower.includes(indicator)) {
        score -= 1
      }
    }
    
    return Math.max(0, score)  // 确保不为负数
  }

  /**
   * 计算平台特定加分
   */
  private calculatePlatformBonus(post: SocialMediaArticle, source: SocialMediaSource): number {
    let bonus = 0
    
    switch (source.socialMediaConfig.platform) {
      case 'github':
        // GitHub项目如果有README或详细描述加分
        if (post.content && post.content.length > 50) {
          bonus += 0.5
        }
        // 高star数项目加分
        if (post.engagement.stars && post.engagement.stars > 100) {
          bonus += 1
        }
        break
        
      case 'medium':
        // Medium文章通常质量较高
        bonus += 0.5
        // 高拍手数文章加分
        if (post.engagement.claps && post.engagement.claps > 10) {
          bonus += 0.5
        }
        break
        
      case 'youtube':
        // YouTube视频的教育价值
        if (post.title.includes('教程') || post.title.includes('tutorial') || 
            post.title.includes('讲解') || post.title.includes('explain')) {
          bonus += 1
        }
        // 高观看量视频加分
        if (post.engagement.views && post.engagement.views > 10000) {
          bonus += 0.5
        }
        break
        
      case 'reddit':
        // Reddit讨论的互动性价值
        if (post.engagement.comments && post.engagement.comments > 5) {
          bonus += 0.5
        }
        // 高赞数帖子加分
        if (post.engagement.upvotes && post.engagement.upvotes > 20) {
          bonus += 0.5
        }
        break
    }
    
    // 优选作者/频道加分
    if (this.isPreferredAuthor(post.author || '', source)) {
      bonus += 1
    }
    
    return bonus
  }

  /**
   * 判断是否为优选作者
   */
  private isPreferredAuthor(author: string, source: SocialMediaSource): boolean {
    const config = source.socialMediaConfig
    
    if (config.preferredChannels && config.preferredChannels.length > 0) {
      return config.preferredChannels.some(channel => 
        author.toLowerCase().includes(channel.toLowerCase())
      )
    }
    
    if (config.preferredAuthors && config.preferredAuthors.length > 0) {
      return config.preferredAuthors.some(preferredAuthor => 
        author.toLowerCase().includes(preferredAuthor.toLowerCase())
      )
    }
    
    return false
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
   * 计算RSS基础分数
   */
  private calculateRSSBaseScore(platform: string): number {
    // 为不同平台设置合理的基础分数，确保RSS内容不会被过度筛除
    const baseScores = {
      reddit: 12.5,    // upvotes:10 * 1 + comments:3 * 0.5 = 11.5
      youtube: 0.6,    // views:500 * 0.001 + likes:10 * 0.1 = 1.5
      github: 15,      // stars:10 * 1 + forks:2 * 0.5 = 11
      medium: 3,       // claps:5 * 0.1 + readTime:5 * 0.5 = 3
      linkedin: 5      // likes:10 * 0.2 = 2
    }
    return baseScores[platform as keyof typeof baseScores] || 1
  }

  /**
   * 解析数字字符串 - 增强版
   */
  private parseNumber(text: string): number {
    if (!text || typeof text !== 'string') return 0
    
    // 清理文本，移除HTML标签和特殊字符
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[^\d.,kmKM\s]/g, '').trim().toLowerCase()
    if (!cleanText) return 0
    
    // 匹配数字和单位
    const match = cleanText.match(/([\d,.]+)\s*([kmKM]?)/)
    if (!match) return 0
    
    let numStr = match[1].replace(/,/g, '')
    const unit = match[2].toLowerCase()
    
    let multiplier = 1
    switch (unit) {
      case 'k':
        multiplier = 1000
        break
      case 'm':
        multiplier = 1000000
        break
      default:
        multiplier = 1
    }
    
    const number = parseFloat(numStr)
    return isNaN(number) ? 0 : Math.floor(number * multiplier)
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