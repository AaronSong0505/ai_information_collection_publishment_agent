import { getSimpleDatabase } from '../database/simple.js'
import { parseRSSFeed } from './simple-rss.js'
import { fetchArticleContent } from './content-fetcher.js'
import logger from '../utils/logger.js'

const MAX_ARTICLES = 10 // 开发阶段限制

export class DevCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void

  async startCrawling(): Promise<void> {
    logger.info('🚀 开始开发版新闻抓取...')
    logger.info(`📊 限制: 最多抓取 ${MAX_ARTICLES} 篇完整文章`)
    
    try {
      // 获取所有启用的新闻源
      const sources = await this.db.getEnabledSources()
      logger.info(`📰 找到 ${sources.length} 个启用的新闻源`)
      
      if (sources.length === 0) {
        logger.warn('⚠️ 没有启用的新闻源')
        return
      }

      // 检查现有文章数量
      const existingArticles = await this.db.searchArticles({ limit: 100, offset: 0 })
      this.articleCount = existingArticles.total
      
      if (this.articleCount >= MAX_ARTICLES) {
        logger.warn(`⚠️ 已达到文章数量限制 (${this.articleCount}/${MAX_ARTICLES})，停止抓取`)
        return
      }
      
      logger.info(`📊 当前已有 ${this.articleCount} 篇文章，还可抓取 ${MAX_ARTICLES - this.articleCount} 篇`)

      // 逐个处理新闻源
      for (const source of sources) {
        if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
          break
        }
        
        await this.crawlSource(source)
        
        // 每个源之间暂停一下，避免请求过快
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

  private async crawlSource(source: any): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) {
      return
    }
    
    logger.info(`📡 处理新闻源: ${source.name} (${source.type})`)
    
    try {
      if (source.type === 'rss') {
        await this.crawlRSSSource(source)
      } else {
        logger.warn(`⚠️ 暂不支持 ${source.type} 类型的新闻源: ${source.name}`)
      }
    } catch (error) {
      logger.error(`❌ 处理新闻源失败: ${source.name}`, error)
    }
  }

  private async crawlRSSSource(source: any): Promise<void> {
    const feed = await parseRSSFeed(source.url)
    if (!feed) {
      logger.error(`❌ RSS 解析失败: ${source.name}`)
      return
    }
    
    logger.info(`📋 ${source.name} 获得 ${feed.items.length} 条新闻`)
    
    // 处理每条新闻
    for (const item of feed.items) {
      if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
        logger.info(`🛑 达到文章数量限制 (${MAX_ARTICLES})，停止抓取`)
        break
      }
      
      try {
        // 检查是否已存在（简单的URL去重）
        const existing = await this.db.searchArticles({ 
          keyword: item.link,
          limit: 1,
          offset: 0 
        })
        
        if (existing.items.length > 0) {
          logger.info(`⏭️ 文章已存在，跳过: ${item.title.substring(0, 30)}...`)
          continue
        }
        
        // 抓取完整内容
        const article = await fetchArticleContent(
          item.link,
          item.title,
          item.description,
          source.name
        )
        
        if (article) {
          // 保存到数据库
          await this.db.saveArticle(article)
          this.articleCount++
          
          logger.success(`💾 文章已保存 (${this.articleCount}/${MAX_ARTICLES}): ${article.title.substring(0, 40)}...`)
          
          // 每篇文章之间暂停，避免请求过快
          await this.sleep(1000)
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
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
let crawlerInstance: DevCrawler | null = null

export function getDevCrawler(): DevCrawler {
  if (!crawlerInstance) {
    crawlerInstance = new DevCrawler()
  }
  return crawlerInstance
}