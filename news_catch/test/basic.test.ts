import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initDatabase } from '../server/database/index.js'
import { SourceStorage } from '../server/database/sources.js'
import { ArticleStorage } from '../server/database/articles.js'
import { Cache } from '../server/database/cache.js'
import useDatabase from '../server/database/index.js'

describe('News Catch System', () => {
  let sourceStorage: SourceStorage
  let articleStorage: ArticleStorage
  let cache: Cache

  beforeAll(async () => {
    // Use in-memory database for testing
    process.env.DATABASE_PATH = ':memory:'
    
    await initDatabase()
    const db = useDatabase()
    
    sourceStorage = new SourceStorage(db)
    articleStorage = new ArticleStorage(db)
    cache = new Cache(db)
  })

  describe('Source Storage', () => {
    it('should add and retrieve a news source', async () => {
      const sourceData = {
        name: 'Test Source',
        url: 'https://example.com/rss',
        type: 'rss' as const,
        config: {},
        enabled: true,
        interval: 300,
      }

      const sourceId = await sourceStorage.add(sourceData)
      expect(sourceId).toBeTruthy()

      const retrieved = await sourceStorage.get(sourceId)
      expect(retrieved).toBeTruthy()
      expect(retrieved?.name).toBe(sourceData.name)
      expect(retrieved?.url).toBe(sourceData.url)
      expect(retrieved?.type).toBe(sourceData.type)
    })

    it('should list all sources', async () => {
      const sources = await sourceStorage.getAll()
      expect(sources.length).toBeGreaterThan(0)
    })

    it('should update source properties', async () => {
      const sources = await sourceStorage.getAll()
      const firstSource = sources[0]
      
      await sourceStorage.update(firstSource.id, { enabled: false })
      
      const updated = await sourceStorage.get(firstSource.id)
      expect(updated?.enabled).toBe(false)
    })
  })

  describe('Article Storage', () => {
    it('should save and retrieve an article', async () => {
      const article = {
        title: 'Test Article',
        content: 'This is test content',
        summary: 'Test summary',
        publishTime: new Date(),
        source: 'test-source',
        url: 'https://example.com/article/1',
        images: [],
        tags: ['test'],
        hash: 'test-hash-123',
      }

      const articleId = await articleStorage.save(article)
      expect(articleId).toBeTruthy()

      const retrieved = await articleStorage.get(articleId)
      expect(retrieved).toBeTruthy()
      expect(retrieved?.title).toBe(article.title)
      expect(retrieved?.content).toBe(article.content)
    })

    it('should search articles', async () => {
      const result = await articleStorage.search({
        keyword: 'test',
        limit: 10,
        offset: 0,
      })

      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Cache System', () => {
    it('should set and get cache', async () => {
      const testData = [
        {
          id: 'test-1',
          title: 'Test News',
          url: 'https://example.com/1',
          source: 'test',
        }
      ]

      await cache.set('test-key', testData)
      
      const cached = await cache.get('test-key')
      expect(cached).toBeTruthy()
      expect(cached?.items).toHaveLength(1)
      expect(cached?.items[0].title).toBe('Test News')
    })

    it('should check cache expiration', async () => {
      const isExpired = await cache.isExpired('test-key', 1000) // 1 second
      expect(typeof isExpired).toBe('boolean')
    })
  })
})