import type { NewsItem, NewsSource, ParsedArticle } from "@shared/types"
import type { CrawlerConfig } from "../types"
import { ContentParser } from "./parser.js"
import { ImageHandler } from "./images.js"
import { generateContentHash } from "../utils/hash.js"
import logger from "../utils/logger.js"
import myFetch from "../utils/fetch.js"

export class CrawlerEngine {
  private config: CrawlerConfig
  private parser: ContentParser
  private imageHandler: ImageHandler
  private runningTasks = new Map<string, AbortController>()

  constructor(config: CrawlerConfig) {
    this.config = config
    this.parser = new ContentParser()
    this.imageHandler = new ImageHandler()
  }

  async crawlSource(source: NewsSource): Promise<NewsItem[]> {
    const taskId = `${source.id}-${Date.now()}`
    const controller = new AbortController()
    this.runningTasks.set(taskId, controller)

    try {
      logger.info(`Starting crawl for source: ${source.name}`)
      
      let items: NewsItem[] = []
      
      switch (source.type) {
        case 'rss':
          items = await this.crawlRSS(source, controller.signal)
          break
        case 'html':
          items = await this.crawlHTML(source, controller.signal)
          break
        case 'api':
          items = await this.crawlAPI(source, controller.signal)
          break
        default:
          throw new Error(`Unsupported source type: ${source.type}`)
      }

      logger.success(`Crawled ${items.length} items from ${source.name}`)
      return items
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn(`Crawl aborted for source: ${source.name}`)
      } else {
        logger.error(`Failed to crawl source ${source.name}:`, error)
      }
      throw error
    } finally {
      this.runningTasks.delete(taskId)
    }
  }

  async parseToArticle(item: NewsItem, source: NewsSource): Promise<ParsedArticle> {
    try {
      // Fetch full content if only summary is available
      let content = item.content || ''
      if (!content && item.url) {
        content = await this.fetchFullContent(item.url, source)
      }

      // Generate content hash for deduplication
      const hash = generateContentHash(item.title, content, item.url)

      // Process images
      const images = await this.imageHandler.processImages(
        item.images || [],
        hash
      )

      return {
        title: item.title,
        content,
        summary: item.extra?.hover || this.generateSummary(content),
        publishTime: this.parseDate(item.pubDate),
        author: item.author,
        source: source.id,
        url: item.url,
        images,
        tags: item.tags || [],
        hash,
      }
    } catch (error) {
      logger.error(`Failed to parse article: ${item.title}`, error)
      throw error
    }
  }

  private async crawlRSS(source: NewsSource, signal: AbortSignal): Promise<NewsItem[]> {
    const { rss2json } = await import('../utils/rss2json.js')
    
    const rssData = await rss2json(source.url)
    if (!rssData) {
      throw new Error('Failed to parse RSS feed')
    }

    return rssData.items.map(item => ({
      id: item.link,
      title: item.title,
      url: item.link,
      content: item.description,
      pubDate: item.created,
      source: source.id,
    }))
  }

  private async crawlHTML(source: NewsSource, signal: AbortSignal): Promise<NewsItem[]> {
    const html = await myFetch(source.url, { 
      signal,
      headers: source.config.headers 
    })
    
    return await this.parser.parseHTML(html, source)
  }

  private async crawlAPI(source: NewsSource, signal: AbortSignal): Promise<NewsItem[]> {
    const response = await myFetch(source.url, {
      signal,
      headers: {
        'Accept': 'application/json',
        ...source.config.headers,
      },
    })

    return await this.parser.parseAPI(response, source)
  }

  private async fetchFullContent(url: string, source: NewsSource): Promise<string> {
    try {
      const html = await myFetch(url, {
        timeout: this.config.timeout,
        headers: source.config.headers,
      })
      
      return await this.parser.extractContent(html, source)
    } catch (error) {
      logger.warn(`Failed to fetch full content from ${url}:`, error)
      return ''
    }
  }

  private parseDate(dateInput?: number | string): Date {
    if (!dateInput) return new Date()
    
    if (typeof dateInput === 'number') {
      return new Date(dateInput)
    }
    
    const parsed = new Date(dateInput)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }

  private generateSummary(content: string, maxLength: number = 200): string {
    if (!content) return ''
    
    // Remove HTML tags and extra whitespace
    const text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    
    if (text.length <= maxLength) return text
    
    // Find the last complete sentence within the limit
    const truncated = text.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1)
    }
    
    return truncated + '...'
  }

  stopCrawl(taskId: string): void {
    const controller = this.runningTasks.get(taskId)
    if (controller) {
      controller.abort()
      this.runningTasks.delete(taskId)
      logger.info(`Crawl task stopped: ${taskId}`)
    }
  }

  stopAllCrawls(): void {
    for (const [taskId, controller] of this.runningTasks) {
      controller.abort()
    }
    this.runningTasks.clear()
    logger.info('All crawl tasks stopped')
  }

  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys())
  }
}

export default CrawlerEngine