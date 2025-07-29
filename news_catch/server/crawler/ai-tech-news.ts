// AI 技术新闻爬虫 - 使用真实的新闻源获取最新 AI 技术资讯
import * as cheerio from 'cheerio'
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { fetchArticleContent } from './content-fetcher.js'
import ImageHandler from './images.js'
import type { ImageInfo } from '../../shared/types.js'

const MAX_ARTICLES = 10 // 开发阶段限制

export class AITechNewsCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void
  private imageHandler = new ImageHandler('./data/images')

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

      // 抓取各个 AI 技术新闻源
      await this.crawl36Kr()
      await this.sleep(2000)
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlITHome()
        await this.sleep(2000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlJuejin()
        await this.sleep(2000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlSolidot()
        await this.sleep(2000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlSSPai()
        await this.sleep(2000)
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
        
        if (itemUrl && title && relativeDate) {
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: `${baseURL}${itemUrl}`,
              title,
              id: itemUrl,
              source: '36kr',
              pubDate: new Date().toISOString(), // 使用当前时间作为发布时间
              content: `${title} - 来自36氪的最新科技资讯报道。`
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
      
      // 抓取完整文章内容
      const fullContent = await fetchArticleContent(
        item.url, 
        item.title, 
        item.content || '', 
        sourceName
      )
      
      if (!fullContent) {
        logger.warn(`⚠️ 无法获取完整内容，使用基本信息: ${item.title}`)
        return this.convertItem(item, sourceName)
      }
      
      // 抓取页面中的图片
      const images = await this.extractImages(item.url, fullContent.title)
      
      // 转换为最终格式
      const article = {
        title: fullContent.title,
        content: fullContent.content,
        summary: fullContent.summary,
        url: fullContent.url,
        publishTime: fullContent.publishTime,
        source: sourceName,
        hash: fullContent.hash,
        images: images,
        tags: ['AI', '科技', '技术']
      }
      
      return article
      
    } catch (error) {
      logger.warn(`⚠️ 完整内容抓取失败: ${item.title}`, error.message)
      return this.convertItem(item, sourceName)
    }
  }

  // 从页面中提取图片
  private async extractImages(url: string, title: string): Promise<ImageInfo[]> {
    try {
      logger.info(`🖼️ 提取图片: ${title.substring(0, 30)}...`)
      
      const html = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(html)
      const images: ImageInfo[] = []
      
      // 查找文章内容中的图片
      const imgSelectors = [
        'article img',
        '.article-content img',
        '.post-content img',
        '.content img',
        'main img',
        '.story-body img'
      ]
      
      const foundImages = new Set<string>() // 去重
      
      for (const selector of imgSelectors) {
        $(selector).each((index, element) => {
          const $img = $(element)
          let imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original')
          
          if (imgSrc && !foundImages.has(imgSrc)) {
            // 处理相对路径
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc
            } else if (imgSrc.startsWith('/')) {
              const baseUrl = new URL(url)
              imgSrc = baseUrl.origin + imgSrc
            } else if (!imgSrc.startsWith('http')) {
              imgSrc = new URL(imgSrc, url).href
            }
            
            // 过滤掉太小的图片和广告图片
            const width = parseInt($img.attr('width') || '0')
            const height = parseInt($img.attr('height') || '0')
            const alt = $img.attr('alt') || ''
            
            // 跳过明显的广告或装饰图片
            if (alt.includes('广告') || alt.includes('ad') || 
                imgSrc.includes('ad') || imgSrc.includes('banner') ||
                (width > 0 && height > 0 && (width < 100 || height < 100))) {
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
        
        if (images.length >= 5) break // 限制图片数量
      }
      
      // 下载图片
      if (images.length > 0) {
        const articleId = this.generateArticleId(title)
        const processedImages = await this.imageHandler.processImages(images, articleId)
        logger.success(`🖼️ 图片处理完成: ${processedImages.length}/${images.length} 张图片`)
        return processedImages
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