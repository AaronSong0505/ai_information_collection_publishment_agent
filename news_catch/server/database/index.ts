import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/better-sqlite3'
import logger from '../utils/logger.js'

let db: ReturnType<typeof createDatabase>

export function useDatabase() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || './data/news_catch.db'
    
    db = createDatabase(sqlite({
      name: dbPath,
    }))
    
    logger.info(`Database initialized: ${dbPath}`)
  }
  
  return db
}

export async function initDatabase() {
  const database = useDatabase()
  
  try {
    // Articles table
    await database.prepare(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        publish_time DATETIME NOT NULL,
        crawl_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        author TEXT,
        source_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        hash TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        tags TEXT,
        metadata TEXT
      )
    `).run()

    // News sources table
    await database.prepare(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        last_crawl DATETIME,
        crawl_interval INTEGER DEFAULT 300,
        error_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // Images table
    await database.prepare(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        original_url TEXT NOT NULL,
        local_path TEXT NOT NULL,
        format TEXT NOT NULL,
        size INTEGER,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      )
    `).run()

    // Crawl logs table
    await database.prepare(`
      CREATE TABLE IF NOT EXISTS crawl_logs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        status TEXT NOT NULL,
        articles_found INTEGER DEFAULT 0,
        articles_saved INTEGER DEFAULT 0,
        error_message TEXT,
        FOREIGN KEY (source_id) REFERENCES news_sources(id)
      )
    `).run()

    // Cache table
    await database.prepare(`
      CREATE TABLE IF NOT EXISTS cache (
        id TEXT PRIMARY KEY,
        updated INTEGER,
        data TEXT
      )
    `).run()

    // Create indexes
    await database.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_publish_time ON articles(publish_time)`).run()
    await database.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)`).run()
    await database.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_hash ON articles(hash)`).run()
    await database.prepare(`CREATE INDEX IF NOT EXISTS idx_images_article_id ON images(article_id)`).run()
    await database.prepare(`CREATE INDEX IF NOT EXISTS idx_crawl_logs_source_id ON crawl_logs(source_id)`).run()

    logger.success('Database tables initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize database:', error)
    throw error
  }
}

export default useDatabase