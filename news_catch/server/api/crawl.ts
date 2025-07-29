import { defineEventHandler, readBody, getQuery } from 'h3'
import { TaskScheduler } from '../scheduler/index.js'
import logger from '../utils/logger.js'

let scheduler: TaskScheduler | null = null

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  try {
    // Initialize scheduler if not exists
    if (!scheduler) {
      scheduler = new TaskScheduler()
    }

    switch (method) {
      case 'GET':
        return await handleGet(event)
      case 'POST':
        return await handlePost(event)
      default:
        throw new Error(`Method ${method} not allowed`)
    }
  } catch (error) {
    logger.error('Crawl API error:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    }
  }
})

async function handleGet(event: any) {
  const query = getQuery(event)
  const { action } = query

  if (!scheduler) {
    return { error: 'Scheduler not initialized', status: 500 }
  }

  switch (action) {
    case 'status':
      return {
        data: {
          runningTasks: scheduler.getRunningTasks(),
          scheduledSources: scheduler.getScheduledSources(),
        }
      }
    default:
      return { error: 'Invalid action', status: 400 }
  }
}

async function handlePost(event: any) {
  const body = await readBody(event)
  const { action, sourceId } = body

  if (!scheduler) {
    return { error: 'Scheduler not initialized', status: 500 }
  }

  switch (action) {
    case 'start':
      await scheduler.start()
      return { data: { message: 'Scheduler started' } }
      
    case 'stop':
      await scheduler.stop()
      return { data: { message: 'Scheduler stopped' } }
      
    case 'crawl':
      if (!sourceId) {
        return { error: 'Source ID required for manual crawl', status: 400 }
      }
      
      // This would trigger a manual crawl for a specific source
      // Implementation would depend on your scheduler design
      return { data: { message: `Manual crawl triggered for source: ${sourceId}` } }
      
    default:
      return { error: 'Invalid action', status: 400 }
  }
}