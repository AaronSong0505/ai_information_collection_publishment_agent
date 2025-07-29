import type { NewsSource, CrawlTask } from "@shared/types"
import { CrawlerEngine } from "../crawler/engine.js"
import { ArticleStorage } from "../database/articles.js"
import { SourceStorage } from "../database/sources.js"
import { Cache } from "../database/cache.js"
import useDatabase from "../database/index.js"
import { generateId } from "../utils/hash.js"
import logger from "../utils/logger.js"

export class TaskScheduler {
  private crawlerEngine: CrawlerEngine
  private articleStorage: ArticleStorage
  private sourceStorage: SourceStorage
  private cache: Cache
  private scheduledTasks = new Map<string, NodeJS.Timeout>()
  private runningTasks = new Map<string, CrawlTask>()

  constructor() {
    const db = useDatabase()
    
    this.crawlerEngine = new CrawlerEngine({
      maxConcurrent: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      userAgent: 'NewsCatch/1.0',
    })
    
    this.articleStorage = new ArticleStorage(db)
    this.sourceStorage = new SourceStorage(db)
    this.cache = new Cache(db)
  }

  async start(): Promise<void> {
    logger.info('Starting task scheduler...')
    
    // Load all enabled sources and schedule them
    const sources = await this.sourceStorage.getEnabled()
    
    for (const source of sources) {
      this.scheduleSource(source)
    }
    
    logger.success(`Scheduled ${sources.length} news sources`)
  }

  async stop(): Promise<void> {
    logger.info('Stopping task scheduler...')
    
    // Clear all scheduled tasks
    for (const [sourceId, timeout] of this.scheduledTasks) {
      clearTimeout(timeout)
    }
    this.scheduledTasks.clear()
    
    // Stop all running crawls
    this.crawlerEngine.stopAllCrawls()
    
    logger.success('Task scheduler stopped')
  }

  scheduleSource(source: NewsSource): void {
    // Clear existing schedule if any
    const existingTimeout = this.scheduledTasks.get(source.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule next crawl
    const delay = this.calculateDelay(source)
    const timeout = setTimeout(() => {
      this.crawlSource(source)
    }, delay)
    
    this.scheduledTasks.set(source.id, timeout)
    
    logger.info(`Scheduled source ${source.name} to run in ${Math.round(delay / 1000)}s`)
  }

  async crawlSource(source: NewsSource): Promise<void> {
    const taskId = generateId()
    const task: CrawlTask = {
      id: taskId,
      sourceId: source.id,
      status: 'running',
      startTime: Date.now(),
      articlesFound: 0,
      articlesSaved: 0,
    }

    this.runningTasks.set(taskId, task)
    
    try {
      logger.info(`Starting crawl task for ${source.name}`)
      
      // Check cache first
      const cacheKey = `source:${source.id}`
      const cached = await this.cache.get(cacheKey)
      
      if (cached && !await this.cache.isExpired(cacheKey, source.interval * 1000)) {
        logger.info(`Using cached data for ${source.name}`)
        task.status = 'completed'
        task.endTime = Date.now()
        task.articlesFound = cached.items.length
        return
      }

      // Crawl source
      const items = await this.crawlerEngine.crawlSource(source)
      task.articlesFound = items.length

      // Process and save articles
      let savedCount = 0
      for (const item of items) {
        try {
          const article = await this.crawlerEngine.parseToArticle(item, source)
          await this.articleStorage.save(article)
          savedCount++
        } catch (error) {
          logger.warn(`Failed to save article: ${item.title}`, error)
        }
      }

      task.articlesSaved = savedCount
      
      // Update cache
      await this.cache.set(cacheKey, items)
      
      // Update source last crawl time and reset error count
      await this.sourceStorage.updateLastCrawl(source.id)
      await this.sourceStorage.resetErrorCount(source.id)
      
      task.status = 'completed'
      task.endTime = Date.now()
      
      logger.success(`Crawl completed for ${source.name}: ${savedCount}/${items.length} articles saved`)
      
    } catch (error) {
      task.status = 'failed'
      task.endTime = Date.now()
      task.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Increment error count
      await this.sourceStorage.incrementErrorCount(source.id)
      
      logger.error(`Crawl failed for ${source.name}:`, error)
    } finally {
      this.runningTasks.delete(taskId)
      
      // Schedule next crawl
      this.scheduleSource(source)
    }
  }

  async addSource(source: Omit<NewsSource, 'id' | 'errorCount'>): Promise<string> {
    const sourceId = await this.sourceStorage.add(source)
    
    if (source.enabled) {
      const fullSource = await this.sourceStorage.get(sourceId)
      if (fullSource) {
        this.scheduleSource(fullSource)
      }
    }
    
    return sourceId
  }

  async removeSource(sourceId: string): Promise<void> {
    // Clear scheduled task
    const timeout = this.scheduledTasks.get(sourceId)
    if (timeout) {
      clearTimeout(timeout)
      this.scheduledTasks.delete(sourceId)
    }
    
    // Remove from database
    await this.sourceStorage.delete(sourceId)
    
    logger.success(`Source removed: ${sourceId}`)
  }

  async updateSource(sourceId: string, updates: Partial<NewsSource>): Promise<void> {
    await this.sourceStorage.update(sourceId, updates)
    
    // Reschedule if enabled
    const source = await this.sourceStorage.get(sourceId)
    if (source && source.enabled) {
      this.scheduleSource(source)
    } else {
      // Remove from schedule if disabled
      const timeout = this.scheduledTasks.get(sourceId)
      if (timeout) {
        clearTimeout(timeout)
        this.scheduledTasks.delete(sourceId)
      }
    }
  }

  getRunningTasks(): CrawlTask[] {
    return Array.from(this.runningTasks.values())
  }

  getScheduledSources(): string[] {
    return Array.from(this.scheduledTasks.keys())
  }

  private calculateDelay(source: NewsSource): number {
    const baseInterval = source.interval * 1000 // Convert to milliseconds
    const lastCrawl = source.lastCrawl || 0
    const timeSinceLastCrawl = Date.now() - lastCrawl
    
    // If enough time has passed, crawl immediately
    if (timeSinceLastCrawl >= baseInterval) {
      return 0
    }
    
    // Otherwise, wait for the remaining time
    return baseInterval - timeSinceLastCrawl
  }
}

export default TaskScheduler