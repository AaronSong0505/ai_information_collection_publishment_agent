// 简单的内存数据库实现，避免 better-sqlite3 编译问题
import { promises as fs } from 'fs'
import { join } from 'path'
import type { NewsSource, ParsedArticle, SearchQuery, SearchResult } from "@shared/types"
import { generateId } from "../utils/hash.js"
import logger from "../utils/logger.js"

// 内存存储
const articles = new Map<string, ParsedArticle>()
const sources = new Map<string, NewsSource>()
const cache = new Map<string, { data: any, timestamp: number }>()

// 数据文件路径
const DATA_DIR = './data'
const ARTICLES_FILE = join(DATA_DIR, 'articles.json')
const SOURCES_FILE = join(DATA_DIR, 'sources.json')

export class SimpleDatabase {
  async init() {
    try {
      // 确保数据目录存在
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.mkdir(join(DATA_DIR, 'images'), { recursive: true })
      
      // 加载现有数据
      await this.loadData()
      
      logger.success('Simple database initialized')
    } catch (error) {
      logger.error('Failed to initialize simple database:', error)
      throw error
    }
  }

  private async loadData() {
    try {
      // 加载文章数据
      try {
        const articlesData = await fs.readFile(ARTICLES_FILE, 'utf-8')
        const articlesArray = JSON.parse(articlesData)
        articlesArray.forEach((article: ParsedArticle & { id: string }) => {
          articles.set(article.id, article)
        })
        logger.info(`Loaded ${articles.size} articles`)
      } catch (error) {
        logger.info('No existing articles file found')
      }

      // 加载新闻源数据
      try {
        const sourcesData = await fs.readFile(SOURCES_FILE, 'utf-8')
        const sourcesArray = JSON.parse(sourcesData)
        sourcesArray.forEach((source: NewsSource) => {
          sources.set(source.id, source)
        })
        logger.info(`Loaded ${sources.size} sources`)
      } catch (error) {
        logger.info('No existing sources file found')
      }
    } catch (error) {
      logger.warn('Error loading data:', error)
    }
  }

  private async saveData(): Promise<void> {
    try {
      // 保存文章数据
      const articlesArray = Array.from(articles.values()).map(article => ({
        ...article,
        publishTime: article.publishTime.toISOString()
      }))
      await fs.writeFile(ARTICLES_FILE, JSON.stringify(articlesArray, null, 2), 'utf-8')

      // 保存新闻源数据
      const sourcesArray = Array.from(sources.values())
      await fs.writeFile(SOURCES_FILE, JSON.stringify(sourcesArray, null, 2), 'utf-8')
    } catch (error) {
      logger.error('Error saving data:', error)
    }
  }

  // 文章操作
  async saveArticle(article: ParsedArticle): Promise<string> {
    const id = generateId()
    articles.set(id, article)
    await this.saveData()
    return id
  }

  async getArticle(id: string): Promise<ParsedArticle | null> {
    return articles.get(id) || null
  }

  async searchArticles(query: SearchQuery): Promise<SearchResult> {
    const { keyword, source, startDate, endDate, limit = 20, offset = 0 } = query
    
    let filteredArticles = Array.from(articles.values())

    // 关键词过滤
    if (keyword) {
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(keyword.toLowerCase()) ||
        article.content.toLowerCase().includes(keyword.toLowerCase())
      )
    }

    // 来源过滤
    if (source) {
      filteredArticles = filteredArticles.filter(article => article.source === source)
    }

    // 时间过滤
    if (startDate) {
      filteredArticles = filteredArticles.filter(article => article.publishTime >= startDate)
    }
    if (endDate) {
      filteredArticles = filteredArticles.filter(article => article.publishTime <= endDate)
    }

    // 排序
    filteredArticles.sort((a, b) => b.publishTime.getTime() - a.publishTime.getTime())

    const total = filteredArticles.length
    const items = filteredArticles.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return { items, total, hasMore }
  }

  async deleteArticle(id: string): Promise<void> {
    articles.delete(id)
    await this.saveData()
  }

  // 新闻源操作
  async addSource(source: Omit<NewsSource, 'id' | 'errorCount'>): Promise<string> {
    const id = generateId()
    const newSource: NewsSource = {
      ...source,
      id,
      errorCount: 0
    }
    sources.set(id, newSource)
    await this.saveData()
    return id
  }

  async getSource(id: string): Promise<NewsSource | null> {
    return sources.get(id) || null
  }

  async getAllSources(): Promise<NewsSource[]> {
    return Array.from(sources.values())
  }

  async getEnabledSources(): Promise<NewsSource[]> {
    return Array.from(sources.values()).filter(source => source.enabled)
  }

  async updateSource(id: string, updates: Partial<NewsSource>): Promise<void> {
    const source = sources.get(id)
    if (source) {
      sources.set(id, { ...source, ...updates })
      await this.saveData()
    }
  }

  async deleteSource(id: string): Promise<void> {
    sources.delete(id)
    await this.saveData()
  }

  // 缓存操作
  async setCache(key: string, value: any): Promise<void> {
    cache.set(key, { data: value, timestamp: Date.now() })
  }

  async getCache(key: string): Promise<any | null> {
    const cached = cache.get(key)
    if (!cached) return null
    
    // 检查是否过期 (30分钟)
    if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
      cache.delete(key)
      return null
    }
    
    return cached.data
  }

  async deleteCache(key: string): Promise<void> {
    cache.delete(key)
  }
}

// 单例实例
let dbInstance: SimpleDatabase | null = null

export function getSimpleDatabase(): SimpleDatabase {
  if (!dbInstance) {
    dbInstance = new SimpleDatabase()
  }
  return dbInstance
}

export async function initSimpleDatabase() {
  const db = getSimpleDatabase()
  await db.init()
  return db
}