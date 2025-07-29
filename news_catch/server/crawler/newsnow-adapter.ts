// NewsNow 爬虫适配器 - 直接使用 newsnow 的现成爬虫实现
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import logger from '../utils/logger.js'

// 导入 newsnow 的工具函数
import myFetch from '../utils/fetch.js'

// 设置全局变量，让 newsnow 的代码能正常工作
if (!globalThis.myFetch) {
  globalThis.myFetch = myFetch
}

// 简化的 defineSource 实现
if (!globalThis.defineSource) {
  globalThis.defineSource = (source: any) => source
}

// 添加一些 newsnow 需要的工具函数
if (!globalThis.parseRelativeDate) {
  globalThis.parseRelativeDate = (dateStr: string, timezone?: string) => {
    // 简单的日期解析实现
    return new Date()
  }
}

const MAX_ARTICLES = 10 // 开发阶段限制

export class NewsNowAdapter {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false

  // 可用的 newsnow 爬虫列表
  private availableCrawlers = {
    'hackernews': () => import('../../newsnow/server/sources/hackernews.js'),
    'github': () => import('../../newsnow/server/sources/github.js'),
    'ithome': () => import('../../newsnow/server/sources/ithome.js'),
    'solidot': () => import('../../newsnow/server/sources/solidot.js'),
    'v2ex': () => import('../../newsnow/server/sources/v2ex.js'),
    'juejin': () => import('../../newsnow/server/sources/juejin.js'),
    'zhihu': () => import('../../newsnow/server/sources/zhihu.js'),
  }

  async startCrawling(): Promise<void> {
    logger.info('🚀 启动 NewsNow 适配器爬虫...')
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

      // 使用几个热门的 newsnow 爬虫
      const crawlersToUse = ['hackernews', 'github', 'ithome', 'v2ex']
      
      for (const crawlerName of crawlersToUse) {
        if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
          break
        }
        
        await this.runNewsNowCrawler(crawlerName)
        
        // 每个爬虫之间暂停
        await this.sleep(3000)
      }
      
      logger.success(`🎉 抓取完成！总共处理了 ${this.articleCount} 篇文章`)
      
    } catch (error) {
      logger.error('❌ 抓取过程出错:', error)
    }
  }

  private async runNewsNowCrawler(crawlerName: string): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) {
      return
    }
    
    logger.info(`🕷️ 运行 NewsNow 爬虫: ${crawlerName}`)
    
    try {
      const crawlerModule = await this.availableCrawlers[crawlerName]()
      const crawler = crawlerModule.default
      
      if (typeof crawler === 'function') {
        // 直接调用爬虫函数
        const items = await crawler()
        await this.processNewsItems(items, crawlerName)
      } else if (typeof crawler === 'object') {
        // 处理多个子爬虫的情况（如 github 有多个变体）
        const keys = Object.keys(crawler)
        const mainKey = keys[0] // 使用第一个
        if (mainKey && typeof crawler[mainKey] === 'function') {
          const items = await crawler[mainKey]()
          await this.processNewsItems(items, crawlerName)
        }
      }
      
    } catch (error) {
      logger.error(`❌ NewsNow 爬虫 ${crawlerName} 执行失败:`, error)
    }
  }

  private async processNewsItems(items: any[], sourceName: string): Promise<void> {
    if (!items || !Array.isArray(items)) {
      logger.warn(`⚠️ ${sourceName} 返回的数据格式不正确`)
      return
    }
    
    logger.info(`📋 ${sourceName} 获得 ${items.length} 条新闻`)
    
    for (const item of items.slice(0, 5)) { // 每个源最多处理5条
      if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
        logger.info(`🛑 达到文章数量限制 (${MAX_ARTICLES})，停止抓取`)
        break
      }
      
      try {
        // 检查是否已存在
        const existing = await this.db.searchArticles({ 
          keyword: item.url || item.id,
          limit: 1,
          offset: 0 
        })
        
        if (existing.items.length > 0) {
          logger.info(`⏭️ 文章已存在，跳过: ${item.title?.substring(0, 30)}...`)
          continue
        }
        
        // 转换为我们的格式
        const article = this.convertNewsNowItem(item, sourceName)
        
        if (article) {
          // 保存到数据库
          await this.db.saveArticle(article)
          this.articleCount++
          
          logger.success(`💾 文章已保存 (${this.articleCount}/${MAX_ARTICLES}): ${article.title.substring(0, 40)}...`)
          
          // 每篇文章之间暂停
          await this.sleep(1000)
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
    }
  }

  private convertNewsNowItem(item: any, sourceName: string): any {
    const title = item.title || '无标题'
    const url = item.url || item.id || ''
    const content = item.extra?.hover || item.description || title
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
      images: [], // NewsNow 通常不包含图片
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
}

// 单例实例
let adapterInstance: NewsNowAdapter | null = null

export function getNewsNowAdapter(): NewsNowAdapter {
  if (!adapterInstance) {
    adapterInstance = new NewsNowAdapter()
  }
  return adapterInstance
}