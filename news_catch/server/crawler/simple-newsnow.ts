// 简化版 NewsNow 爬虫 - 直接复制核心逻辑
import * as cheerio from 'cheerio'
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'

const MAX_ARTICLES = 10 // 开发阶段限制

export class SimpleNewsNowCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void

  async startCrawling(): Promise<void> {
    logger.info('🚀 启动简化版 NewsNow 爬虫...')
    logger.info(`📊 限制: 最多抓取 ${MAX_ARTICLES} 篇完整文章`)
    
    try {
      // 检查现有文章数量
      const existingArticles = await this.db.searchArticles({ limit: 100, offset: 0 })
      this.articleCount = existingArticles.total
      
      if (this.articleCount >= MAX_ARTICLES) {
        logger.warn(`⚠️ 已达到文章数量限制 (${this.articleCount}/${MAX_ARTICLES})，停止抓取`)
        return
      }
      
      logger.info(`📊 当前已有 ${this.articleCount} 篇文章，还可抓取 ${MAX_ARTICLES - this.articleCount} 篇`)

      // 运行各个爬虫
      await this.crawlHackerNews()
      await this.sleep(2000)
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlGitHubTrending()
        await this.sleep(2000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.crawlV2EX()
        await this.sleep(2000)
      }
      
      logger.success(`🎉 抓取完成！总共处理了 ${this.articleCount} 篇文章`)
      
      // 如果达到限制，触发完成回调
      if (this.articleCount >= MAX_ARTICLES && this.onComplete) {
        logger.info('🛑 达到文章数量限制，准备停止服务...')
        setTimeout(() => {
          this.onComplete?.()
        }, 2000) // 延迟 2 秒后停止服务
      }
      
    } catch (error) {
      logger.error('❌ 抓取过程出错:', error)
    }
  }

  private async crawlHackerNews(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Hacker News...')
    
    try {
      const baseURL = "https://news.ycombinator.com"
      const html = await myFetch(baseURL)
      const $ = cheerio.load(html)
      const $main = $(".athing")
      
      const items: any[] = []
      $main.each((_, el) => {
        const a = $(el).find(".titleline a").first()
        const title = a.text()
        const id = $(el).attr("id")
        const score = $(`#score_${id}`).text()
        const url = `${baseURL}/item?id=${id}`
        
        if (url && id && title) {
          items.push({
            url,
            title,
            id,
            extra: { info: score },
            source: 'hackernews'
          })
        }
      })
      
      await this.processItems(items, 'hackernews')
      
    } catch (error) {
      logger.error('❌ Hacker News 抓取失败:', error)
    }
  }

  private async crawlGitHubTrending(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 GitHub Trending...')
    
    try {
      const baseURL = "https://github.com"
      const html = await myFetch("https://github.com/trending?spoken_language_code=")
      const $ = cheerio.load(html)
      const $main = $("main .Box div[data-hpc] > article")
      
      const items: any[] = []
      $main.each((_, el) => {
        const a = $(el).find(">h2 a")
        const title = a.text().replace(/\n+/g, "").trim()
        const url = a.attr("href")
        const star = $(el).find("[href$=stargazers]").text().replace(/\s+/g, "").trim()
        const desc = $(el).find(">p").text().replace(/\n+/g, "").trim()
        
        if (url && title) {
          items.push({
            url: `${baseURL}${url}`,
            title,
            id: url,
            extra: {
              info: `✰ ${star}`,
              hover: desc,
            },
            source: 'github'
          })
        }
      })
      
      await this.processItems(items, 'github')
      
    } catch (error) {
      logger.error('❌ GitHub Trending 抓取失败:', error)
    }
  }

  private async crawlV2EX(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 V2EX...')
    
    try {
      const html = await myFetch("https://www.v2ex.com")
      const $ = cheerio.load(html)
      const items: any[] = []
      
      $(".cell.item").each((_, el) => {
        const $el = $(el)
        const $a = $el.find(".item_title a")
        const url = $a.attr("href")
        const title = $a.text().trim()
        const replies = $el.find(".count_livid").text() || "0"
        
        if (url && title) {
          items.push({
            url: `https://www.v2ex.com${url}`,
            title,
            id: url,
            extra: { info: `${replies} 回复` },
            source: 'v2ex'
          })
        }
      })
      
      await this.processItems(items, 'v2ex')
      
    } catch (error) {
      logger.error('❌ V2EX 抓取失败:', error)
    }
  }

  private async processItems(items: any[], sourceName: string): Promise<void> {
    logger.info(`📋 ${sourceName} 获得 ${items.length} 条新闻`)
    
    for (const item of items.slice(0, 3)) { // 每个源最多处理3条
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
        
        // 转换为我们的格式
        const article = this.convertItem(item, sourceName)
        
        if (article) {
          // 保存到数据库
          await this.db.saveArticle(article)
          this.articleCount++
          
          logger.success(`💾 文章已保存 (${this.articleCount}/${MAX_ARTICLES}): ${article.title.substring(0, 40)}...`)
          
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
          await this.sleep(1000)
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
    }
  }

  private convertItem(item: any, sourceName: string): any {
    const title = item.title || '无标题'
    const url = item.url || ''
    const content = item.extra?.hover || item.description || title
    const publishTime = new Date()
    
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
      tags: []
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
let crawlerInstance: SimpleNewsNowCrawler | null = null

export function getSimpleNewsNowCrawler(): SimpleNewsNowCrawler {
  if (!crawlerInstance) {
    crawlerInstance = new SimpleNewsNowCrawler()
  }
  return crawlerInstance
}