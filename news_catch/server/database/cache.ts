import type { NewsItem, SourceID } from "@shared/types"
import type { Database } from "db0"
import type { CacheInfo, CacheRow } from "../types"
import logger from "../utils/logger.js"

export class Cache {
  private db: Database
  
  constructor(db: Database) {
    this.db = db
  }

  async set(key: string, value: NewsItem[]) {
    const now = Date.now()
    
    try {
      await this.db.prepare(
        `INSERT OR REPLACE INTO cache (id, data, updated) VALUES (?, ?, ?)`
      ).run(key, JSON.stringify(value), now)
      
      logger.success(`Cache set for ${key}`)
    } catch (error) {
      logger.error(`Failed to set cache for ${key}:`, error)
      throw error
    }
  }

  async get(key: string): Promise<CacheInfo | undefined> {
    try {
      const row = await this.db.prepare(
        `SELECT id, data, updated FROM cache WHERE id = ?`
      ).get(key) as CacheRow | undefined
      
      if (row) {
        logger.success(`Cache hit for ${key}`)
        return {
          id: row.id as SourceID,
          updated: row.updated,
          items: JSON.parse(row.data),
        }
      }
      
      logger.info(`Cache miss for ${key}`)
      return undefined
    } catch (error) {
      logger.error(`Failed to get cache for ${key}:`, error)
      return undefined
    }
  }

  async getMultiple(keys: string[]): Promise<CacheInfo[]> {
    if (keys.length === 0) return []
    
    try {
      const placeholders = keys.map(() => '?').join(',')
      const rows = await this.db.prepare(
        `SELECT id, data, updated FROM cache WHERE id IN (${placeholders})`
      ).all(...keys) as CacheRow[]

      logger.success(`Retrieved ${rows.length} cached items`)
      
      return rows.map(row => ({
        id: row.id as SourceID,
        updated: row.updated,
        items: JSON.parse(row.data) as NewsItem[],
      }))
    } catch (error) {
      logger.error('Failed to get multiple cache items:', error)
      return []
    }
  }

  async delete(key: string) {
    try {
      await this.db.prepare(`DELETE FROM cache WHERE id = ?`).run(key)
      logger.success(`Cache deleted for ${key}`)
    } catch (error) {
      logger.error(`Failed to delete cache for ${key}:`, error)
      throw error
    }
  }

  async clear() {
    try {
      await this.db.prepare(`DELETE FROM cache`).run()
      logger.success('All cache cleared')
    } catch (error) {
      logger.error('Failed to clear cache:', error)
      throw error
    }
  }

  async isExpired(key: string, maxAge: number = 30 * 60 * 1000): Promise<boolean> {
    const cached = await this.get(key)
    if (!cached) return true
    
    return Date.now() - cached.updated > maxAge
  }
}

export default Cache