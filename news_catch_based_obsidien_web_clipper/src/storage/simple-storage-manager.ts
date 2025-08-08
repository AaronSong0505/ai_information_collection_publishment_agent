// 简化的存储管理器 - 仅使用 JSON 文件
import { promises as fs } from 'fs'
import { join } from 'path'
import { consola } from 'consola'
import type { ArticleContent, NewsSource } from '../types/index.js'

export class SimpleStorageManager {
  private logger = consola.withTag('SimpleStorage')
  private dataDir: string
  private articlesFile: string
  private articles: ArticleContent[] = []

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir
    this.articlesFile = join(dataDir, 'articles.json')
  }

  /**
   * 初始化存储管理器
   */
  async init(): Promise<void> {
    try {
      // 确保数据目录存在
      await fs.mkdir(this.dataDir, { recursive: true })
      await fs.mkdir(join(this.dataDir, 'images'), { recursive: true })

      // 加载现有文章
      await this.loadArticles()

      this.logger.success('✅ 简化存储管理器初始化完成')
    } catch (error) {
      this.logger.error('❌ 存储管理器初始化失败', error)
      throw error
    }
  }

  /**
   * 加载文章
   */
  private async loadArticles(): Promise<void> {
    try {
      const data = await fs.readFile(this.articlesFile, 'utf-8')
      this.articles = JSON.parse(data).map((article: any) => ({
        ...article,
        publishTime: new Date(article.publishTime)
      }))
      this.logger.info(`📚 加载了 ${this.articles.length} 篇文章`)
    } catch (error) {
      // 文件不存在，创建空数组
      this.articles = []
      await this.saveArticles()
      this.logger.info('📝 创建了新的文章存储文件')
    }
  }

  /**
   * 保存文章
   */
  async saveArticle(article: ArticleContent): Promise<void> {
    // 检查是否已存在
    const exists = this.articles.some(a => a.hash === article.hash || a.url === article.url)
    
    if (exists) {
      this.logger.warn(`⚠️ 文章已存在，跳过: ${article.title}`)
      return
    }

    this.articles.push(article)
    await this.saveArticles()
    
    this.logger.success(
      `💾 文章已保存: ${article.title} (${article.content.length} 字符, ${article.images.length} 张图片)`
    )
  }

  /**
   * 批量保存文章
   */
  async saveArticles(articles?: ArticleContent[]): Promise<{
    saved: number
    skipped: number
    errors: number
  }> {
    if (articles) {
      let saved = 0
      let skipped = 0
      let errors = 0

      this.logger.info(`💾 开始批量保存 ${articles.length} 篇文章...`)

      for (const article of articles) {
        try {
          const exists = this.articles.some(a => a.hash === article.hash || a.url === article.url)
          
          if (exists) {
            skipped++
          } else {
            this.articles.push(article)
            saved++
          }
        } catch (error) {
          errors++
          this.logger.error(`❌ 保存文章失败: ${article.title}`, error.message)
        }
      }

      await this.persistArticles()

      this.logger.success(
        `✅ 批量保存完成: ${saved} 保存, ${skipped} 跳过, ${errors} 错误`
      )

      return { saved, skipped, errors }
    } else {
      // 保存当前文章数组到文件
      await this.persistArticles()
      return { saved: 0, skipped: 0, errors: 0 }
    }
  }

  /**
   * 持久化文章到文件
   */
  private async persistArticles(): Promise<void> {
    const data = JSON.stringify(this.articles.map(article => ({
      ...article,
      publishTime: article.publishTime.toISOString()
    })), null, 2)
    
    await fs.writeFile(this.articlesFile, data, 'utf-8')
  }

  /**
   * 搜索文章
   */
  searchArticles(options: {
    source?: string
    keyword?: string
    limit?: number
    offset?: number
    sortBy?: 'publishTime' | 'title'
    sortOrder?: 'ASC' | 'DESC'
  } = {}): {
    items: ArticleContent[]
    total: number
  } {
    const {
      source,
      keyword,
      limit = 20,
      offset = 0,
      sortBy = 'publishTime',
      sortOrder = 'DESC'
    } = options

    let filteredArticles = [...this.articles]

    // 按来源过滤
    if (source) {
      filteredArticles = filteredArticles.filter(article => article.source === source)
    }

    // 按关键词过滤
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filteredArticles = filteredArticles.filter(article => 
        article.title.toLowerCase().includes(lowerKeyword) ||
        article.content.toLowerCase().includes(lowerKeyword)
      )
    }

    // 排序
    filteredArticles.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'publishTime') {
        comparison = a.publishTime.getTime() - b.publishTime.getTime()
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title)
      }
      
      return sortOrder === 'DESC' ? -comparison : comparison
    })

    const total = filteredArticles.length
    const items = filteredArticles.slice(offset, offset + limit)

    return { items, total }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalArticles: number
    totalImages: number
    sourceStats: Array<{
      source: string
      count: number
      latestArticle: string
    }>
    recentArticles: number
  } {
    const totalArticles = this.articles.length
    const totalImages = this.articles.reduce((sum, article) => sum + article.images.length, 0)

    // 按来源统计
    const sourceMap = new Map<string, { count: number; latest: Date }>()
    
    this.articles.forEach(article => {
      const current = sourceMap.get(article.source) || { count: 0, latest: new Date(0) }
      current.count++
      if (article.publishTime > current.latest) {
        current.latest = article.publishTime
      }
      sourceMap.set(article.source, current)
    })

    const sourceStats = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      count: data.count,
      latestArticle: data.latest.toISOString()
    }))

    // 最近24小时的文章
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentArticles = this.articles.filter(article => article.publishTime > oneDayAgo).length

    return {
      totalArticles,
      totalImages,
      sourceStats,
      recentArticles
    }
  }

  /**
   * 清理旧数据
   */
  async cleanup(daysToKeep: number = 30): Promise<{
    deletedArticles: number
    deletedImages: number
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const originalCount = this.articles.length
    const deletedImages = this.articles
      .filter(article => article.publishTime < cutoffDate)
      .reduce((sum, article) => sum + article.images.length, 0)

    this.articles = this.articles.filter(article => article.publishTime >= cutoffDate)
    
    await this.saveArticles()

    const deletedArticles = originalCount - this.articles.length

    this.logger.info(
      `🧹 清理完成: 删除了 ${deletedArticles} 篇文章和 ${deletedImages} 张图片`
    )

    return { deletedArticles, deletedImages }
  }

  /**
   * 备份数据
   */
  async backup(backupDir: string = './backup'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(backupDir, `backup-${timestamp}`)
    
    await fs.mkdir(backupPath, { recursive: true })
    
    // 备份JSON文件
    await fs.copyFile(
      this.articlesFile,
      join(backupPath, 'articles.json')
    )
    
    this.logger.success(`💾 数据备份完成: ${backupPath}`)
    return backupPath
  }

  /**
   * 关闭存储管理器
   */
  close(): void {
    this.logger.info('📊 简化存储管理器已关闭')
  }
}