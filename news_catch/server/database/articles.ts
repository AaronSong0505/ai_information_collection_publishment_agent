import type { Database } from "db0"
import type { ParsedArticle, SearchQuery, SearchResult } from "@shared/types"
import type { ArticleRow } from "../types"
import { generateId } from "../utils/hash.js"
import logger from "../utils/logger.js"

export class ArticleStorage {
  private db: Database
  
  constructor(db: Database) {
    this.db = db
  }

  async save(article: ParsedArticle): Promise<string> {
    const id = generateId()
    
    try {
      // Check if article already exists by hash
      const existing = await this.db.prepare(
        `SELECT id FROM articles WHERE hash = ?`
      ).get(article.hash) as { id: string } | undefined

      if (existing) {
        logger.info(`Article already exists: ${article.title}`)
        return existing.id
      }

      await this.db.prepare(`
        INSERT INTO articles (
          id, title, content, summary, publish_time, author, 
          source_id, source_url, hash, tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        article.title,
        article.content,
        article.summary,
        article.publishTime.toISOString(),
        article.author,
        article.source,
        article.url,
        article.hash,
        JSON.stringify(article.tags),
        JSON.stringify({ images: article.images })
      )

      logger.success(`Article saved: ${article.title}`)
      return id
    } catch (error) {
      logger.error(`Failed to save article: ${article.title}`, error)
      throw error
    }
  }

  async get(id: string): Promise<ParsedArticle | null> {
    try {
      const row = await this.db.prepare(
        `SELECT * FROM articles WHERE id = ? AND status = 'active'`
      ).get(id) as ArticleRow | undefined

      if (!row) return null

      return this.rowToArticle(row)
    } catch (error) {
      logger.error(`Failed to get article ${id}:`, error)
      return null
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const { keyword, source, startDate, endDate, limit = 20, offset = 0 } = query
    
    let sql = `SELECT * FROM articles WHERE status = 'active'`
    const params: any[] = []

    if (keyword) {
      sql += ` AND (title LIKE ? OR content LIKE ?)`
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    if (source) {
      sql += ` AND source_id = ?`
      params.push(source)
    }

    if (startDate) {
      sql += ` AND publish_time >= ?`
      params.push(startDate.toISOString())
    }

    if (endDate) {
      sql += ` AND publish_time <= ?`
      params.push(endDate.toISOString())
    }

    sql += ` ORDER BY publish_time DESC LIMIT ? OFFSET ?`
    params.push(limit + 1, offset) // +1 to check if there are more results

    try {
      const rows = await this.db.prepare(sql).all(...params) as ArticleRow[]
      
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(row => this.rowToArticle(row))
      
      // Get total count for pagination
      let countSql = `SELECT COUNT(*) as total FROM articles WHERE status = 'active'`
      const countParams: any[] = []
      
      if (keyword) {
        countSql += ` AND (title LIKE ? OR content LIKE ?)`
        countParams.push(`%${keyword}%`, `%${keyword}%`)
      }
      if (source) {
        countSql += ` AND source_id = ?`
        countParams.push(source)
      }
      if (startDate) {
        countSql += ` AND publish_time >= ?`
        countParams.push(startDate.toISOString())
      }
      if (endDate) {
        countSql += ` AND publish_time <= ?`
        countParams.push(endDate.toISOString())
      }

      const countResult = await this.db.prepare(countSql).get(...countParams) as { total: number }

      return {
        items,
        total: countResult.total,
        hasMore,
      }
    } catch (error) {
      logger.error('Failed to search articles:', error)
      return { items: [], total: 0, hasMore: false }
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.prepare(
        `UPDATE articles SET status = 'deleted' WHERE id = ?`
      ).run(id)
      
      logger.success(`Article deleted: ${id}`)
    } catch (error) {
      logger.error(`Failed to delete article ${id}:`, error)
      throw error
    }
  }

  async getBySource(sourceId: string, limit: number = 50): Promise<ParsedArticle[]> {
    try {
      const rows = await this.db.prepare(`
        SELECT * FROM articles 
        WHERE source_id = ? AND status = 'active' 
        ORDER BY publish_time DESC 
        LIMIT ?
      `).all(sourceId, limit) as ArticleRow[]

      return rows.map(row => this.rowToArticle(row))
    } catch (error) {
      logger.error(`Failed to get articles for source ${sourceId}:`, error)
      return []
    }
  }

  private rowToArticle(row: ArticleRow): ParsedArticle {
    const metadata = row.metadata ? JSON.parse(row.metadata) : {}
    
    return {
      title: row.title,
      content: row.content,
      summary: row.summary,
      publishTime: new Date(row.publish_time),
      author: row.author,
      source: row.source_id,
      url: row.source_url,
      images: metadata.images || [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      hash: row.hash,
    }
  }
}

export default ArticleStorage