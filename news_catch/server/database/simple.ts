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

// 默认新闻源配置
const DEFAULT_SOURCES: Omit<NewsSource, 'id' | 'errorCount'>[] = [
  {
    name: "36氪",
    enabled: true,
    url: "https://www.36kr.com/newsflashes",
    description: "创业和科技资讯"
  },
  {
    name: "IT之家",
    enabled: true,
    url: "https://www.ithome.com/list/",
    description: "科技新闻"
  },
  {
    name: "掘金",
    enabled: true,
    url: "https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0",
    description: "技术文章"
  },
  {
    name: "Solidot",
    enabled: true,
    url: "https://www.solidot.org",
    description: "开源技术新闻"
  },
  {
    name: "少数派",
    enabled: true,
    url: "https://sspai.com/api/v1/article/tag/page/get?limit=30&offset=0&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false",
    description: "科技生活文章"
  }
]

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
          // 确保publishTime是Date对象
          if (typeof article.publishTime === 'string') {
            article.publishTime = new Date(article.publishTime)
          }
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
        if (sourcesArray.length > 0) {
          sourcesArray.forEach((source: NewsSource) => {
            sources.set(source.id, source)
          })
          logger.info(`Loaded ${sources.size} sources`)
        } else {
          logger.info('Sources file is empty, creating default sources')
          // 如果sources.json文件存在但为空数组，则创建默认配置
          await this.createDefaultSources()
        }
      } catch (error) {
        logger.info('No existing sources file found, creating default sources')
        // 如果没有找到sources.json文件，则创建默认配置
        await this.createDefaultSources()
      }
    } catch (error) {
      logger.warn('Error loading data:', error)
    }
  }

  private async createDefaultSources() {
    // 只有在没有新闻源时才创建默认新闻源
    if (sources.size === 0) {
      // 创建默认新闻源
      for (const source of DEFAULT_SOURCES) {
        const id = generateId();
        const newSource: NewsSource = {
          ...source,
          id,
          errorCount: 0
        }
        sources.set(id, newSource)
      }
      
      // 保存默认新闻源到文件
      await this.saveData()
      logger.info(`Created ${sources.size} default sources`)
    }
  }

  private async saveData(): Promise<void> {
    try {
      // 保存文章数据
      const articlesArray = Array.from(articles.values()).map(article => ({
        ...article,
        publishTime: article.publishTime instanceof Date ? article.publishTime.toISOString() : article.publishTime
      }))
      await fs.writeFile(ARTICLES_FILE, JSON.stringify(articlesArray, null, 2), 'utf-8')

      // 保存新闻源数据
      const sourcesArray = Array.from(sources.values())
      await fs.writeFile(SOURCES_FILE, JSON.stringify(sourcesArray, null, 2), 'utf-8')
    } catch (error) {
      logger.error('Error saving data:', error)
    }
  }

  // 确保sources.json文件初始化
  async ensureSourcesFile(): Promise<void> {
    try {
      // 检查文件是否存在
      await fs.access(SOURCES_FILE)
      
      // 检查文件内容
      const content = await fs.readFile(SOURCES_FILE, 'utf-8')
      const sourcesArray = JSON.parse(content)
      if (!Array.isArray(sourcesArray) || sourcesArray.length === 0) {
        // 文件为空或内容为空数组，写入默认配置
        await this.createDefaultSources()
      }
    } catch (error) {
      // 文件不存在，创建默认配置
      await this.createDefaultSources()
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
    filteredArticles.sort((a, b) => {
      const timeA = a.publishTime instanceof Date ? a.publishTime.getTime() : new Date(a.publishTime).getTime()
      const timeB = b.publishTime instanceof Date ? b.publishTime.getTime() : new Date(b.publishTime).getTime()
      return timeB - timeA
    })

    const total = filteredArticles.length
    const items = filteredArticles.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return { items, total, hasMore }
  }

  // 新闻源操作
  getAllSources(): NewsSource[] {
    return Array.from(sources.values())
  }

  async updateSource(sourceId: string, updates: Partial<NewsSource>): Promise<boolean> {
    const source = sources.get(sourceId)
    if (!source) return false
    
    Object.assign(source, updates)
    await this.saveData()
    return true
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