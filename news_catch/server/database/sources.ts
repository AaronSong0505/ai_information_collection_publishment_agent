import type { Database } from "db0"
import type { NewsSource } from "@shared/types"
import { generateId } from "../utils/hash.js"
import logger from "../utils/logger.js"

export class SourceStorage {
  private db: Database
  
  constructor(db: Database) {
    this.db = db
  }

  async add(source: Omit<NewsSource, 'id' | 'errorCount'>): Promise<string> {
    const id = generateId()
    
    try {
      await this.db.prepare(`
        INSERT INTO news_sources (
          id, name, url, type, config, enabled, crawl_interval
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        source.name,
        source.url,
        source.type,
        JSON.stringify(source.config),
        source.enabled,
        source.interval
      )

      logger.success(`News source added: ${source.name}`)
      return id
    } catch (error) {
      logger.error(`Failed to add news source: ${source.name}`, error)
      throw error
    }
  }

  async get(id: string): Promise<NewsSource | null> {
    try {
      const row = await this.db.prepare(
        `SELECT * FROM news_sources WHERE id = ?`
      ).get(id) as any

      if (!row) return null

      return {
        id: row.id,
        name: row.name,
        url: row.url,
        type: row.type,
        config: JSON.parse(row.config),
        enabled: Boolean(row.enabled),
        interval: row.crawl_interval,
        lastCrawl: row.last_crawl ? new Date(row.last_crawl).getTime() : undefined,
        errorCount: row.error_count,
      }
    } catch (error) {
      logger.error(`Failed to get news source ${id}:`, error)
      return null
    }
  }

  async getAll(): Promise<NewsSource[]> {
    try {
      const rows = await this.db.prepare(
        `SELECT * FROM news_sources ORDER BY name`
      ).all() as any[]

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        type: row.type,
        config: JSON.parse(row.config),
        enabled: Boolean(row.enabled),
        interval: row.crawl_interval,
        lastCrawl: row.last_crawl ? new Date(row.last_crawl).getTime() : undefined,
        errorCount: row.error_count,
      }))
    } catch (error) {
      logger.error('Failed to get all news sources:', error)
      return []
    }
  }

  async getEnabled(): Promise<NewsSource[]> {
    try {
      const rows = await this.db.prepare(
        `SELECT * FROM news_sources WHERE enabled = true ORDER BY name`
      ).all() as any[]

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        type: row.type,
        config: JSON.parse(row.config),
        enabled: Boolean(row.enabled),
        interval: row.crawl_interval,
        lastCrawl: row.last_crawl ? new Date(row.last_crawl).getTime() : undefined,
        errorCount: row.error_count,
      }))
    } catch (error) {
      logger.error('Failed to get enabled news sources:', error)
      return []
    }
  }

  async update(id: string, updates: Partial<NewsSource>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.url !== undefined) {
      fields.push('url = ?')
      values.push(updates.url)
    }
    if (updates.type !== undefined) {
      fields.push('type = ?')
      values.push(updates.type)
    }
    if (updates.config !== undefined) {
      fields.push('config = ?')
      values.push(JSON.stringify(updates.config))
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(updates.enabled)
    }
    if (updates.interval !== undefined) {
      fields.push('crawl_interval = ?')
      values.push(updates.interval)
    }
    if (updates.errorCount !== undefined) {
      fields.push('error_count = ?')
      values.push(updates.errorCount)
    }

    if (fields.length === 0) return

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    try {
      await this.db.prepare(
        `UPDATE news_sources SET ${fields.join(', ')} WHERE id = ?`
      ).run(...values)

      logger.success(`News source updated: ${id}`)
    } catch (error) {
      logger.error(`Failed to update news source ${id}:`, error)
      throw error
    }
  }

  async updateLastCrawl(id: string): Promise<void> {
    try {
      await this.db.prepare(
        `UPDATE news_sources SET last_crawl = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(id)
    } catch (error) {
      logger.error(`Failed to update last crawl for ${id}:`, error)
      throw error
    }
  }

  async incrementErrorCount(id: string): Promise<void> {
    try {
      await this.db.prepare(
        `UPDATE news_sources SET error_count = error_count + 1 WHERE id = ?`
      ).run(id)
    } catch (error) {
      logger.error(`Failed to increment error count for ${id}:`, error)
      throw error
    }
  }

  async resetErrorCount(id: string): Promise<void> {
    try {
      await this.db.prepare(
        `UPDATE news_sources SET error_count = 0 WHERE id = ?`
      ).run(id)
    } catch (error) {
      logger.error(`Failed to reset error count for ${id}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.prepare(`DELETE FROM news_sources WHERE id = ?`).run(id)
      logger.success(`News source deleted: ${id}`)
    } catch (error) {
      logger.error(`Failed to delete news source ${id}:`, error)
      throw error
    }
  }
}

export default SourceStorage