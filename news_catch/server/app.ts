import { createApp, toNodeListener, defineEventHandler } from 'h3'
import { createServer } from 'http'
import { initDatabase } from './database/index.js'
import { TaskScheduler } from './scheduler/index.js'
import logger from './utils/logger.js'
import './globals.js' // Import global definitions

// Import API routes
import sourcesAPI from './api/sources.js'
import articlesAPI from './api/articles.js'
import crawlAPI from './api/crawl.js'

const app = createApp()

// API routes
app.use('/api/sources', sourcesAPI)
app.use('/api/articles', articlesAPI)
app.use('/api/crawl', crawlAPI)

// Health check
app.use('/health', defineEventHandler(() => {
  return { status: 'ok', timestamp: new Date().toISOString() }
}))

// Global error handler
app.use('/', defineEventHandler((event) => {
  return { error: 'Not found', status: 404 }
}))

async function startServer() {
  try {
    // Initialize database
    await initDatabase()
    logger.success('Database initialized')

    // Start scheduler
    const scheduler = new TaskScheduler()
    await scheduler.start()
    logger.success('Task scheduler started')

    // Start HTTP server
    const port = process.env.PORT || 3000
    const server = createServer(toNodeListener(app))
    
    server.listen(port, () => {
      logger.success(`News Catch server running on port ${port}`)
      logger.info(`Health check: http://localhost:${port}/health`)
      logger.info(`API endpoints:`)
      logger.info(`  - GET/POST /api/sources - Manage news sources`)
      logger.info(`  - GET /api/articles - Search articles`)
      logger.info(`  - POST /api/crawl - Control crawler`)
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...')
      await scheduler.stop()
      server.close(() => {
        logger.success('Server shut down gracefully')
        process.exit(0)
      })
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export { app, startServer }