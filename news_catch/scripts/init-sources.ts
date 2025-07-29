import { initDatabase } from '../server/database/index.js'
import { SourceStorage } from '../server/database/sources.js'
import useDatabase from '../server/database/index.js'
import logger from '../server/utils/logger.js'

const defaultSources = [
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    type: 'html' as const,
    config: {
      selectors: {
        title: '.titleline a',
        link: '.titleline a',
        date: '.age',
      }
    },
    enabled: true,
    interval: 300,
  },
  {
    name: 'GitHub Trending',
    url: 'https://github.com/trending',
    type: 'html' as const,
    config: {
      selectors: {
        title: 'h2 a',
        link: 'h2 a',
        content: 'p',
      }
    },
    enabled: true,
    interval: 600,
  },
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

async function initDefaultSources() {
  try {
    logger.info('Initializing database...')
    await initDatabase()
    
    const db = useDatabase()
    const sourceStorage = new SourceStorage(db)
    
    logger.info('Adding default news sources...')
    
    for (const source of defaultSources) {
      try {
        const sourceId = await sourceStorage.add(source)
        logger.success(`Added source: ${source.name} (${sourceId})`)
      } catch (error) {
        logger.warn(`Failed to add source ${source.name}:`, error)
      }
    }
    
    logger.success('Default sources initialization completed!')
    
    // List all sources
    const allSources = await sourceStorage.getAll()
    logger.info(`Total sources: ${allSources.length}`)
    
    allSources.forEach(source => {
      logger.info(`- ${source.name} (${source.type}) - ${source.enabled ? 'enabled' : 'disabled'}`)
    })
    
  } catch (error) {
    logger.error('Failed to initialize default sources:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDefaultSources()
}

export { initDefaultSources }