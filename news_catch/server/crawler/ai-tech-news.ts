// AI 技术新闻爬虫 - 使用真实的新闻源获取最新 AI 技术资讯
import * as cheerio from 'cheerio'
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { fetchArticleContent, fetchArticleContentWithImages } from './content-fetcher.js'
import ImageHandler from './images.js'
import type { ImageInfo } from '../../shared/types.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 定义新闻源类型
interface NewsSource {
  id: string
  name: string
  enabled: boolean
  url: string
  description: string
}

const MAX_ARTICLES = 10 // 开发阶段限制

export class AITechNewsCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void
  private imageHandler = new ImageHandler('./data/images')
  private sources: NewsSource[] = []

  constructor() {
    // 从配置文件加载新闻源
    try {
      const sourcesPath = join(__dirname, '../../data/sources.json')
      const sourcesData = readFileSync(sourcesPath, 'utf-8')
      const rawSources = JSON.parse(sourcesData)
      
      // 转换原始数据格式以匹配NewsSource接口
      this.sources = rawSources.map((source: any) => ({
        id: source.id,
        name: source.name,
        enabled: source.enabled !== undefined ? source.enabled : true, // 默认启用
        url: source.url,
        description: source.description || source.name
      }))
      
      logger.info(`📋 成功加载 ${this.sources.length} 个新闻源配置`)
    } catch (error) {
      logger.error('❌ 无法加载新闻源配置文件:', error.message)
      // 默认新闻源配置
      this.sources = [
        {
          id: "36kr",
          name: "36氪",
          enabled: true,
          url: "https://www.36kr.com/newsflashes",
          description: "创业和科技资讯"
        },
        {
          id: "ithome",
          name: "IT之家",
          enabled: true,
          url: "https://www.ithome.com/list/",
          description: "科技新闻"
        },
        {
          id: "juejin",
          name: "掘金",
          enabled: true,
          url: "https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0",
          description: "技术文章"
        },
        {
          id: "solidot",
          name: "Solidot",
          enabled: true,
          url: "https://www.solidot.org",
          description: "开源技术新闻"
        },
        {
          id: "sspai",
          name: "少数派",
          enabled: true,
          url: "https://sspai.com/api/v1/article/tag/page/get?limit=30&offset=0&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false",
          description: "科技生活文章"
        }
      ]
    }
  }

  async startCrawling(): Promise<void> {
    logger.info('🤖 启动 AI 技术新闻爬虫...')
    logger.info(`📊 限制: 最多抓取 ${MAX_ARTICLES} 篇完整文章`)
    logger.info('🎯 专注: AI 技术、科技新闻、创业资讯')
    
    try {
      // 检查现有文章数量
      const existingArticles = await this.db.searchArticles({ limit: 100, offset: 0 })
      this.articleCount = existingArticles.total
      
      if (this.articleCount >= MAX_ARTICLES) {
        logger.warn(`⚠️ 已达到文章数量限制 (${this.articleCount}/${MAX_ARTICLES})，停止抓取`)
        return
      }
      
      logger.info(`📊 当前已有 ${this.articleCount} 篇文章，还可抓取 ${MAX_ARTICLES - this.articleCount} 篇`)

      // 根据配置文件中的新闻源进行抓取
      for (const source of this.sources) {
        if (!source.enabled) {
          logger.info(`⏭️ 跳过已禁用的新闻源: ${source.name}`)
          continue
        }
        
        if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
          break
        }
        
        switch (source.id) {
          case '36kr':
            await this.crawl36Kr()
            break
          case 'ithome':
            await this.crawlITHome()
            break
          case 'juejin':
            await this.crawlJuejin()
            break
          case 'solidot':
            await this.crawlSolidot()
            break
          case 'sspai':
            await this.crawlSSPai()
            break
          case 'techcrunch':
            await this.crawlTechCrunch()
            break
          case 'arstechnica':
            await this.crawlArsTechnica()
            break
          case 'hackernews':
            await this.crawlHackerNews()
            break
          case 'wired':
            await this.crawlWired()
            break
          case 'mittech':
            await this.crawlMITTechReview()
            break
          default:
            logger.warn(`⚠️ 未知的新闻源: ${source.id}`)
        }
        
        // 在抓取每个新闻源之间添加延迟
        if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
          await this.sleep(2000)
        }
      }
      
      logger.success(`🎉 抓取完成！总共处理了 ${this.articleCount} 篇文章`)
      
      // 如果达到限制，触发完成回调
      if (this.articleCount >= MAX_ARTICLES && this.onComplete) {
        logger.info('🛑 达到文章数量限制，准备停止服务...')
        setTimeout(() => {
          this.onComplete?.()
        }, 2000)
      }
      
    } catch (error) {
      logger.error('❌ 抓取过程出错:', error)
    }
  }

  // 36氪 - 创业和科技资讯
  private async crawl36Kr(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 36氪 科技资讯...')
    
    try {
      const baseURL = "https://www.36kr.com"
      const url = `${baseURL}/newsflashes`
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $(".newsflash-item")
      $items.each((_, el) => {
        const $el = $(el)
        const $a = $el.find("a.item-title")
        const itemUrl = $a.attr("href")
        const title = $a.text().trim()
        const relativeDate = $el.find(".time").text()
        const description = $el.find(".brief").text().trim() // 获取描述信息
        
        if (itemUrl && title && relativeDate) {
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: `${baseURL}${itemUrl}`,
              title,
              id: itemUrl,
              source: '36kr',
              pubDate: new Date().toISOString(), // 使用当前时间作为发布时间
              content: description || `${title} - 来自36氪的最新科技资讯报道。` // 使用描述信息
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), '36kr')
      
    } catch (error) {
      logger.error('❌ 36氪抓取失败:', error.message)
    }
  }

  // IT之家 - 科技新闻
  private async crawlITHome(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 IT之家 科技新闻...')
    
    try {
      const response = await myFetch("https://www.ithome.com/list/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $main = $("#list > div.fl > ul > li")
      $main.each((_, el) => {
        const $el = $(el)
        const $a = $el.find("a.t")
        const url = $a.attr("href")
        const title = $a.text().trim()
        const date = $(el).find("i").text()
        
        if (url && title && date) {
          // 过滤广告和 AI 相关内容
          const isAd = url?.includes("lapin") || ["神券", "优惠", "补贴", "京东"].find(k => title.includes(k))
          if (!isAd && this.isAIRelated(title)) {
            items.push({
              url,
              title,
              id: url,
              source: 'ithome',
              pubDate: new Date().toISOString(),
              content: `${title} - IT之家报道，${date}发布的最新科技新闻。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), 'ithome')
      
    } catch (error) {
      logger.error('❌ IT之家抓取失败:', error.message)
    }
  }

  // 掘金 - 技术文章
  private async crawlJuejin(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 掘金 技术文章...')
    
    try {
      const url = `https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0`
      const res = await myFetch(url, { timeout: 15000 })
      const items: any[] = []
      
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((k: any) => {
          const title = k.content?.title
          const contentId = k.content?.content_id
          
          if (title && contentId && this.isAIRelated(title)) {
            items.push({
              id: contentId,
              title,
              url: `https://juejin.cn/post/${contentId}`,
              source: 'juejin',
              pubDate: new Date().toISOString(),
              content: `${title} - 掘金热门技术文章，专注于前沿技术分享。`
            })
          }
        })
      }
      
      await this.processItems(items.slice(0, 2), 'juejin')
      
    } catch (error) {
      logger.error('❌ 掘金抓取失败:', error.message)
    }
  }

  // Solidot - 开源技术新闻
  private async crawlSolidot(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Solidot 开源技术新闻...')
    
    try {
      const baseURL = "https://www.solidot.org"
      const html = await myFetch(baseURL, { timeout: 15000 })
      const $ = cheerio.load(html)
      const items: any[] = []
      
      const $main = $(".block_m")
      $main.each((_, el) => {
        const a = $(el).find(".bg_htit a").last()
        const url = a.attr("href")
        const title = a.text().trim()
        const dateRaw = $(el).find(".talk_time").text().match(/发表于(.*?分)/)?.[1]
        
        if (url && title && this.isAIRelated(title)) {
          items.push({
            url: baseURL + url,
            title,
            id: url,
            source: 'solidot',
            pubDate: new Date().toISOString(),
            content: `${title} - Solidot 开源技术新闻报道，关注最新的技术发展动态。`
          })
        }
      })
      
      await this.processItems(items.slice(0, 2), 'solidot')
      
    } catch (error) {
      logger.error('❌ Solidot抓取失败:', error.message)
    }
  }

  // 少数派 - 科技生活
  private async crawlSSPai(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 少数派 科技文章...')
    
    try {
      const timestamp = Date.now()
      const limit = 30
      const url = `https://sspai.com/api/v1/article/tag/page/get?limit=${limit}&offset=0&created_at=${timestamp}&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false`
      const res = await myFetch(url, { timeout: 15000 })
      const items: any[] = []
      
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((k: any) => {
          const title = k.title
          const id = k.id
          
          if (title && id && this.isAIRelated(title)) {
            items.push({
              id,
              title,
              url: `https://sspai.com/post/${id}`,
              source: 'sspai',
              pubDate: new Date().toISOString(),
              content: `${title} - 少数派科技文章，专注于数字生活和效率工具。`
            })
          }
        })
      }
      
      await this.processItems(items.slice(0, 2), 'sspai')
      
    } catch (error) {
      logger.error('❌ 少数派抓取失败:', error.message)
    }
  }

  // TechCrunch - 科技创业媒体
  private async crawlTechCrunch(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 TechCrunch AI 资讯...')
    
    try {
      const url = "https://techcrunch.com/category/artificial-intelligence/"
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      $('.post-block').each((_, el) => {
        const $el = $(el)
        const $a = $el.find('h2 a')
        const title = $a.text().trim()
        const itemUrl = $a.attr('href')
        const excerpt = $el.find('.post-block__content').text().trim()
        const timeElement = $el.find('time')
        const pubDate = timeElement.attr('datetime')
        
        if (itemUrl && title) {
          items.push({
            title,
            url: itemUrl,
            content: excerpt,
            pubDate: pubDate ? new Date(pubDate) : new Date()
          })
        }
      })
      
      logger.info(`📋 techcrunch 获得 ${items.length} 条 AI 相关新闻`)
      
      // 处理文章
      await this.processItems(items.slice(0, 5), 'TechCrunch')
      
    } catch (error) {
      logger.error('❌ TechCrunch 抓取失败:', error.message)
    }
  }

  // Ars Technica - 高质量科技新闻
  private async crawlArsTechnica(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Ars Technica 科技资讯...')
    
    try {
      const url = "https://arstechnica.com/information-technology/"
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      $('.listing').each((_, el) => {
        const $el = $(el)
        const $a = $el.find('h2 a')
        const title = $a.text().trim()
        const itemUrl = $a.attr('href')
        const excerpt = $el.find('.excerpt').text().trim()
        const timeElement = $el.find('time')
        const pubDate = timeElement.attr('datetime')
        
        if (itemUrl && title) {
          items.push({
            title,
            url: itemUrl,
            content: excerpt,
            pubDate: pubDate ? new Date(pubDate) : new Date()
          })
        }
      })
      
      logger.info(`📋 arstechnica 获得 ${items.length} 条 AI 相关新闻`)
      
      // 处理文章
      await this.processItems(items.slice(0, 5), 'Ars Technica')
      
    } catch (error) {
      logger.error('❌ Ars Technica 抓取失败:', error.message)
    }
  }

  // Hacker News
  private async crawlHackerNews(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Hacker News...')
    
    try {
      const url = "https://hnrss.org/newest?q=ai"
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response, { xmlMode: true })
      const items: any[] = []
      
      $('item').each((_, el) => {
        const $el = $(el)
        const title = $el.find('title').text().trim()
        const itemUrl = $el.find('link').text().trim()
        const description = $el.find('description').text().trim()
        const pubDate = $el.find('pubDate').text().trim()
        
        if (itemUrl && title) {
          items.push({
            title,
            url: itemUrl,
            content: description,
            pubDate: pubDate ? new Date(pubDate) : new Date()
          })
        }
      })
      
      logger.info(`📋 hackernews 获得 ${items.length} 条 AI 相关新闻`)
      
      // 处理文章
      await this.processItems(items.slice(0, 5), 'Hacker News')
      
    } catch (error) {
      logger.error('❌ Hacker News 抓取失败:', error.message)
    }
  }

  // Wired - 科技、文化、商业和政治的交叉点
  private async crawlWired(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Wired AI 资讯...')
    
    try {
      const url = "https://www.wired.com/category/artificial-intelligence/"
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      $('.summary-item').each((_, el) => {
        const $el = $(el)
        const $a = $el.find('h3 a')
        const title = $a.text().trim()
        const itemUrl = $a.attr('href')
        const excerpt = $el.find('.summary-item__content').text().trim()
        const timeElement = $el.find('time')
        const pubDate = timeElement.attr('datetime')
        
        if (itemUrl && title) {
          items.push({
            title,
            url: 'https://www.wired.com' + itemUrl,
            content: excerpt,
            pubDate: pubDate ? new Date(pubDate) : new Date()
          })
        }
      })
      
      logger.info(`📋 wired 获得 ${items.length} 条 AI 相关新闻`)
      
      // 处理文章
      await this.processItems(items.slice(0, 5), 'Wired')
      
    } catch (error) {
      logger.error('❌ Wired 抓取失败:', error.message)
    }
  }

  // MIT Technology Review
  private async crawlMITTechReview(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 MIT Technology Review AI 资讯...')
    
    try {
      const url = "https://www.technologyreview.com/topic/artificial-intelligence/"
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      $('.story-card').each((_, el) => {
        const $el = $(el)
        const $a = $el.find('h3 a')
        const title = $a.text().trim()
        const itemUrl = $a.attr('href')
        const excerpt = $el.find('.story-card__body').text().trim()
        const timeElement = $el.find('time')
        const pubDate = timeElement.attr('datetime')
        
        if (itemUrl && title) {
          items.push({
            title,
            url: 'https://www.technologyreview.com' + itemUrl,
            content: excerpt,
            pubDate: pubDate ? new Date(pubDate) : new Date()
          })
        }
      })
      
      logger.info(`📋 mittech 获得 ${items.length} 条 AI 相关新闻`)
      
      // 处理文章
      await this.processItems(items.slice(0, 5), 'MIT Technology Review')
      
    } catch (error) {
      logger.error('❌ MIT Technology Review 抓取失败:', error.message)
    }
  }

  // 判断是否为 AI 相关内容
  private isAIRelated(title: string): boolean {
    const aiKeywords = [
      'AI', 'ai', '人工智能', '机器学习', '深度学习', 'ChatGPT', 'GPT', 'OpenAI',
      '大模型', 'LLM', '神经网络', '算法', 'TensorFlow', 'PyTorch', '自动驾驶',
      '计算机视觉', 'NLP', '自然语言', 'Transformer', 'BERT', '语言模型',
      '智能', '自动化', '机器人', 'ML', 'DL', '数据科学', '预测', '识别',
      'Claude', 'Gemini', 'Llama', '文心', '通义', '智谱', '百川', '讯飞',
      '科技', '技术', '创新', '研发', '算力', '芯片', 'GPU', 'NVIDIA', 'AMD',
      '云计算', '边缘计算', '量子', '区块链', '元宇宙', 'VR', 'AR', 'XR'
    ]
    
    return aiKeywords.some(keyword => title.includes(keyword))
  }

  private async processItems(items: any[], sourceName: string): Promise<void> {
    logger.info(`📋 ${sourceName} 获得 ${items.length} 条 AI 相关新闻`)
    
    for (const item of items) {
      if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
        logger.info(`🛑 达到文章数量限制 (${MAX_ARTICLES})，停止抓取`)
        break
      }
      
      try {
        // 检查是否已存在
        const existing = await this.db.searchArticles({ 
          keyword: item.url,
          limit: 1,
          offset: 0 
        })
        
        if (existing.items.length > 0) {
          logger.info(`⏭️ 文章已存在，跳过: ${item.title?.substring(0, 30)}...`)
          continue
        }
        
        // 抓取完整内容和图片
        const fullArticle = await this.fetchFullContent(item, sourceName)
        
        if (fullArticle) {
          // 保存到数据库
          await this.db.saveArticle(fullArticle)
          this.articleCount++
          
          logger.success(`💾 AI新闻已保存 (${this.articleCount}/${MAX_ARTICLES}): ${fullArticle.title.substring(0, 40)}... [${fullArticle.content.length}字符, ${fullArticle.images.length}图片]`)
          
          // 检查是否达到限制
          if (this.articleCount >= MAX_ARTICLES) {
            logger.info('🎯 已达到文章数量限制，准备停止服务...')
            if (this.onComplete) {
              setTimeout(() => {
                this.onComplete?.()
              }, 2000)
            }
            return
          }
          
          // 每篇文章之间暂停
          await this.sleep(2000) // 增加延迟，给内容抓取更多时间
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
    }
  }

  // 抓取完整文章内容和图片
  private async fetchFullContent(item: any, sourceName: string): Promise<any | null> {
    try {
      logger.info(`🔍 抓取完整内容: ${item.title.substring(0, 50)}...`)
      
      // 先抓取页面中的图片，建立URL到ID的映射
      const images = await this.extractImages(item.url, item.title)
      const imageMap = new Map<string, string>()
      
      // 建立图片URL到ID的映射
      images.forEach(image => {
        if (image.originalUrl && image.id) {
          imageMap.set(image.originalUrl, image.id)
          
          // 也处理可能的相对路径情况
          if (image.originalUrl.startsWith('//')) {
            imageMap.set('https:' + image.originalUrl, image.id)
          }
          
          // 处理URL参数变体（特别是少数派等网站）
          try {
            const urlObj = new URL(image.originalUrl)
            const baseUrl = urlObj.origin + urlObj.pathname
            
            // 添加基础URL（无参数）
            imageMap.set(baseUrl, image.id)
            
            // 添加常见的参数变体
            const commonParams = [
              '?imageView2/2/w/1920/q/90/interlace/1/ignore-error/1',
              '?imageView2/2/w/1200/q/90/interlace/1/ignore-error/1',
              '?imageView2/2/w/800/q/90/interlace/1/ignore-error/1',
              '?imageView2/2/format/webp',
              '?x-oss-process=image/resize,w_1920',
              ''
            ]
            
            commonParams.forEach(param => {
              const variantUrl = baseUrl + param
              if (variantUrl !== image.originalUrl) {
                imageMap.set(variantUrl, image.id)
              }
            })
            
          } catch (e) {
            // 如果URL解析失败，忽略
          }
        }
      })
      
      // 抓取完整文章内容，传入图片映射
      const fullContent = await fetchArticleContentWithImages(
        item.url, 
        item.title, 
        item.content || '', 
        sourceName,
        imageMap
      )
      
      if (!fullContent) {
        logger.warn(`⚠️ 无法获取完整内容，使用基本信息: ${item.title}`)
        return this.convertItem(item, sourceName)
      }
      
      // 转换为最终格式
      const article = {
        title: fullContent.title,
        content: fullContent.content, // 现在包含 <<image_id>> 标签
        summary: fullContent.summary,
        url: fullContent.url,
        publishTime: fullContent.publishTime,
        source: sourceName,
        hash: fullContent.hash,
        images: images,
        tags: ['AI', '科技', '技术']
      }
      
      logger.info(`📝 内容处理完成: ${images.length} 张图片已标记在正文中`)
      return article
      
    } catch (error) {
      logger.warn(`⚠️ 完整内容抓取失败: ${item.title}`, (error as Error).message)
      return this.convertItem(item, sourceName)
    }
  }

  // 从页面中提取图片
  private async extractImages(url: string, title: string): Promise<ImageInfo[]> {
    try {
      logger.info(`🖼️ 提取图片: ${title.substring(0, 30)}...`)
      
      const html = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(html)
      
      // 移除不需要的元素
      $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .comment').remove()
      
      // 尝试多种常见的图片选择器
      const imgSelectors = [
        'article img',           // 文章中的图片
        '.content img',          // 内容区域的图片
        '.post-content img',     // 文章内容中的图片
        '.article-body img',     // 文章正文中的图片
        'main img',              // 主要内容中的图片
        '.article-content img',  // 文章内容区域的图片
        '.story-content img',    // 故事内容区域的图片
        '.post-body img',        // 文章主体中的图片
        '.entry-content img',    // 条目内容中的图片
        '.content-body img',     // 内容主体中的图片
        '.sspai-article img',    // 少数派文章图片
        '.article-body-wrapper img', // 文章主体包装器中的图片
        'img',                   // 所有图片（备选）
      ]
      
      const images: ImageInfo[] = []
      const foundImages = new Set<string>() // 去重
      
      for (const selector of imgSelectors) {
        $(selector).each((index, element) => {
          const $img = $(element)
          // 优先使用 data-src、data-original 等懒加载属性
          let imgSrc = $img.attr('data-src') || 
                      $img.attr('data-original') || 
                      $img.attr('data-lazy-src') ||
                      $img.attr('src')
          
          // 特殊处理少数派网站的图片URL
          if (url.includes('sspai.com')) {
            // 对于少数派，使用高清图片URL
            if (imgSrc && imgSrc.includes('?')) {
              // 移除参数中的限制，获取更高清的图片
              const baseUrl = imgSrc.split('?')[0]
              imgSrc = baseUrl + '?imageView2/2/w/1920/q/90/interlace/1/ignore-error/1'
            }
          }
          
          // 特殊处理掘金网站的图片URL
          if (url.includes('juejin.cn')) {
            // 掘金的图片URL包含时效性签名，需要特殊处理
            if (imgSrc && imgSrc.includes('~tplv')) {
              // 尝试移除签名参数，使用基础图片URL
              const urlObj = new URL(imgSrc);
              // 保留基础路径和文件名，移除查询参数
              imgSrc = urlObj.origin + urlObj.pathname;
            }
          }
          
          // 特殊处理Wired网站的图片
          if (url.includes('wired.com')) {
            if (imgSrc && imgSrc.includes('w_1')) {
              // 获取更大尺寸的图片
              imgSrc = imgSrc.replace(/w_\d+/, 'w_1920');
            }
          }
          
          // 特殊处理Ars Technica网站的图片
          if (url.includes('arstechnica.com')) {
            if (imgSrc && imgSrc.includes('?')) {
              // 移除参数以获取原始尺寸图片
              imgSrc = imgSrc.split('?')[0];
            }
          }
          
          if (imgSrc && !foundImages.has(imgSrc)) {
            // 处理相对路径
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc
            } else if (imgSrc.startsWith('/')) {
              const baseUrl = new URL(url)
              imgSrc = baseUrl.origin + imgSrc
            } else if (!imgSrc.startsWith('http')) {
              // 确保所有URL都是绝对路径
              try {
                imgSrc = new URL(imgSrc, url).href
              } catch (e) {
                // 如果无法构建URL，跳过此图片
                return
              }
            }
            
            // 过滤掉占位图和明显无效的图片
            if (this.isPlaceholderImage(imgSrc)) {
              return
            }
            
            // 过滤掉太小的图片和广告图片
            const width = parseInt($img.attr('width') || '0')
            const height = parseInt($img.attr('height') || '0')
            const alt = $img.attr('alt') || ''
            const titleAttr = $img.attr('title') || ''
            
            // 跳过明显的广告或装饰图片
            if (alt.includes('广告') || alt.includes('ad') || 
                imgSrc.includes('ad') || imgSrc.includes('banner') ||
                imgSrc.includes('logo') || imgSrc.includes('icon') ||
                (width > 0 && height > 0 && (width < 50 || height < 50))) {
              return
            }
            
            // 检查是否为有效的图片扩展名
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
            const hasValidExtension = validExtensions.some(ext => 
              imgSrc.toLowerCase().includes(ext)
            )
            
            // 如果没有明确的扩展名，但有典型的图片路径模式，也接受
            const looksLikeImage = imgSrc.includes('/images/') || 
                                  imgSrc.includes('/img/') || 
                                  imgSrc.includes('/media/') ||
                                  imgSrc.includes('image') ||
                                  imgSrc.includes('picture')
            
            if (!hasValidExtension && !looksLikeImage) {
              // 跳过可能不是图片的资源
              return
            }
            
            foundImages.add(imgSrc)
            images.push({
              id: `img-${Date.now()}-${index}`,
              originalUrl: imgSrc,
              localPath: '',
              format: this.getImageFormat(imgSrc),
              size: 0,
              width: width > 0 ? width : undefined,
              height: height > 0 ? height : undefined
            })
          }
        })
        
        // 如果已经找到足够的图片，就停止搜索
        if (images.length >= 15) break
      }
      
      // 只有在找到图片时才下载它们
      if (images.length > 0) {
        const articleId = this.generateArticleId(title)
        const processedImages = await this.imageHandler.processImages(images, articleId)
        
        // 过滤掉无效的图片（没有成功下载的图片）
        const validImages = processedImages.filter(img => img.localPath && img.size && img.size > 0)
        
        logger.success(`🖼️ 图片处理完成: ${validImages.length}/${images.length} 张有效图片`)
        return validImages
      }
      
      return []
      
    } catch (error) {
      logger.warn(`⚠️ 图片提取失败: ${title}`, error.message)
      return []
    }
  }

  private generateArticleId(title: string): string {
    return `ai-${Date.now()}-${title.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`
  }

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    if (extension && supportedFormats.includes(extension)) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
    return 'jpg'
  }

  // 判断是否为占位图片
  private isPlaceholderImage(url: string): boolean {
    const placeholderPatterns = [
      'placeholder',
      'ui/img',
      'default.png',
      't.png',  // IT之家的追踪像素
      'icon-',
      'logo',
      'avatar',
      'byteimg.com/tos-cn-i-73owjymdk6/~tplv' // 掘金的无效图片标记
    ]
    
    return placeholderPatterns.some(pattern => url.includes(pattern))
  }

  private convertItem(item: any, sourceName: string): any {
    const title = item.title || '无标题'
    const url = item.url || ''
    const content = item.content || `${title} - 来自${sourceName}的最新AI技术资讯。`
    const publishTime = item.pubDate ? new Date(item.pubDate) : new Date()
    
    // 生成内容哈希用于去重
    const hash = generateContentHash(title, content, url)
    
    return {
      title: title.trim(),
      content: content.trim(),
      summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
      url,
      publishTime,
      source: sourceName,
      hash,
      images: [],
      tags: ['AI', '科技', '技术']
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  stop(): void {
    logger.info('🛑 收到停止信号')
    this.shouldStop = true
  }

  getStatus(): { articleCount: number, maxArticles: number, shouldStop: boolean } {
    return {
      articleCount: this.articleCount,
      maxArticles: MAX_ARTICLES,
      shouldStop: this.shouldStop
    }
  }

  setOnComplete(callback: () => void): void {
    this.onComplete = callback
  }
}

// 单例实例
let crawlerInstance: AITechNewsCrawler | null = null

export function getAITechNewsCrawler(): AITechNewsCrawler {
  if (!crawlerInstance) {
    crawlerInstance = new AITechNewsCrawler()
  }
  return crawlerInstance
}