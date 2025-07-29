import { createApp, toNodeListener, defineEventHandler, readBody, getQuery } from 'h3'
import { createServer } from 'http'
import { initSimpleDatabase, getSimpleDatabase } from './database/simple.js'
import { getDevCrawler } from './crawler/dev-crawler.js'
import { getSimpleNewsNowCrawler } from './crawler/simple-newsnow.js'
import { getMockNewsNowCrawler } from './crawler/mock-newsnow.js'
import logger from './utils/logger.js'
import './globals.js'

const app = createApp()

// 简单的 API 路由
app.use('/api/sources', defineEventHandler(async (event) => {
  const db = getSimpleDatabase()
  
  if (event.node.req.method === 'GET') {
    const sources = await db.getAllSources()
    return { data: sources }
  }
  
  if (event.node.req.method === 'POST') {
    const body = await readBody(event)
    const { name, url, type, config = {}, enabled = true, interval = 300 } = body
    
    if (!name || !url || !type) {
      return { error: 'Missing required fields: name, url, type', status: 400 }
    }

    const sourceId = await db.addSource({
      name, url, type, config, enabled, interval
    })

    return { data: { id: sourceId }, status: 201 }
  }
  
  return { error: 'Method not allowed', status: 405 }
}))

app.use('/api/articles', defineEventHandler(async (event) => {
  const db = getSimpleDatabase()
  
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const { keyword, source, limit = '20', offset = '0' } = query

    const searchQuery = {
      keyword: keyword as string,
      source: source as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    }

    const result = await db.searchArticles(searchQuery)
    return { data: result }
  }
  
  return { error: 'Method not allowed', status: 405 }
}))

// 爬虫控制 API
app.use('/api/crawl', defineEventHandler(async (event) => {
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const { action, type = 'dev' } = query
    
    if (action === 'status') {
      let crawler
      if (type === 'newsnow') {
        crawler = getSimpleNewsNowCrawler()
      } else if (type === 'mock') {
        crawler = getMockNewsNowCrawler()
      } else {
        crawler = getDevCrawler()
      }
      return { data: { ...crawler.getStatus(), type } }
    }
    
    return { error: 'Invalid action', status: 400 }
  }
  
  if (event.node.req.method === 'POST') {
    const body = await readBody(event)
    const { action, type = 'dev' } = body
    
    if (action === 'start') {
      let crawler, crawlerName
      if (type === 'newsnow') {
        crawler = getSimpleNewsNowCrawler()
        crawlerName = 'NewsNow 简化爬虫'
      } else if (type === 'mock') {
        crawler = getMockNewsNowCrawler()
        crawlerName = 'Mock NewsNow 爬虫'
      } else {
        crawler = getDevCrawler()
        crawlerName = '开发版爬虫'
      }
      
      // 设置完成回调，达到 10 篇文章后停止服务
      (crawler as any).setOnComplete(() => {
        logger.info('🛑 爬虫完成，正在停止服务...')
        setTimeout(() => {
          if (serverInstance) {
            serverInstance.close(() => {
              logger.success('✅ 服务已自动停止')
              process.exit(0)
            })
          }
        }, 1000)
      })
      
      // 异步启动爬虫，不阻塞响应
      crawler.startCrawling().catch(error => {
        logger.error(`${crawlerName}执行出错:`, error)
      })
      
      return { 
        data: { 
          message: `${crawlerName}已启动`,
          type,
          maxArticles: 10,
          note: '达到10篇文章后将自动停止',
          availableCrawlers: type === 'newsnow' ? ['hackernews', 'github', 'ithome', 'v2ex'] : 
                            type === 'mock' ? ['hackernews', 'github', 'v2ex', 'ithome'] : ['rss', 'custom']
        } 
      }
    }
    
    if (action === 'stop') {
      let crawler
      if (type === 'newsnow') {
        crawler = getSimpleNewsNowCrawler()
      } else if (type === 'mock') {
        crawler = getMockNewsNowCrawler()
      } else {
        crawler = getDevCrawler()
      }
      crawler.stop()
      return { data: { message: '爬虫停止信号已发送', type } }
    }
    
    return { error: 'Invalid action', status: 400 }
  }
  
  return { error: 'Method not allowed', status: 405 }
}))

// 健康检查
app.use('/health', defineEventHandler(() => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'simple-json',
    message: 'News Catch server is running!'
  }
}))

// 根路径
app.use('/', defineEventHandler(() => {
  return { 
    message: 'News Catch API Server (Development Mode)',
    endpoints: [
      'GET /health - Health check',
      'GET /api/sources - List news sources',
      'POST /api/sources - Add news source',
      'GET /api/articles - Search articles',
      'POST /api/crawl - Start/stop crawler',
      'GET /api/crawl?action=status - Crawler status'
    ],
    devMode: {
      maxArticles: 10,
      note: 'Crawler will stop after 10 articles in development mode'
    },
    crawlerTypes: {
      dev: 'Custom RSS + content fetching crawler',
      newsnow: 'NewsNow ready-made crawlers (HackerNews, GitHub, ITHome, V2EX)',
      mock: 'Mock crawler with simulated data (no network issues)'
    }
  }
}))

let serverInstance: any = null

async function startServer() {
  try {
    // 初始化简单数据库
    await initSimpleDatabase()
    logger.success('Simple database initialized')

    // 添加一些默认新闻源
    const db = getSimpleDatabase()
    const existingSources = await db.getAllSources()
    
    if (existingSources.length === 0) {
      logger.info('Adding default news sources...')
      
      const defaultSources = [
        {
          name: 'BBC News RSS',
          url: 'http://feeds.bbci.co.uk/news/rss.xml',
          type: 'rss' as const,
          config: {},
          enabled: true,
          interval: 300,
        },
        {
          name: 'TechCrunch RSS',
          url: 'https://techcrunch.com/feed/',
          type: 'rss' as const,
          config: {},
          enabled: true,
          interval: 600,
        },
      ]

      for (const source of defaultSources) {
        try {
          const sourceId = await db.addSource(source)
          logger.success(`Added source: ${source.name} (${sourceId})`)
        } catch (error) {
          logger.warn(`Failed to add source ${source.name}:`, error)
        }
      }
    }

    // 启动 HTTP 服务器
    const port = process.env.PORT || 3000
    const server = createServer(toNodeListener(app))
    serverInstance = server
    
    server.listen(port, () => {
      logger.success(`🚀 News Catch server running on port ${port}`)
      logger.info(`📍 Health check: http://localhost:${port}/health`)
      logger.info(`📍 API endpoints:`)
      logger.info(`   - GET /api/sources - List news sources`)
      logger.info(`   - POST /api/sources - Add news source`)
      logger.info(`   - GET /api/articles - Search articles`)
      logger.info(`   - POST /api/crawl - Start/stop crawler`)
      logger.info(`   - GET /api/crawl?action=status - Crawler status`)
      logger.info(`✅ Server is ready to accept connections!`)
      logger.info(`🕷️ 开发模式：爬虫限制最多抓取 10 篇文章`)
      logger.info(`📰 可用爬虫类型:`)
      logger.info(`   - type=dev: 自定义开发爬虫 (RSS + 内容抓取)`)
      logger.info(`   - type=newsnow: NewsNow 现成爬虫 (HackerNews, GitHub, ITHome, V2EX)`)
      logger.info(`   - type=mock: Mock 爬虫 (使用模拟数据，避免网络问题)`)
    })

    // 优雅关闭
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down server...')
      server.close(() => {
        logger.success('✅ Server shut down gracefully')
        process.exit(0)
      })
    })

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()