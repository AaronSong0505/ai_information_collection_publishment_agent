import { defineEventHandler, getQuery } from 'h3'
import { ArticleStorage } from '../database/articles.js'
import useDatabase from '../database/index.js'
import logger from '../utils/logger.js'

const articleStorage = new ArticleStorage(useDatabase())

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  try {
    switch (method) {
      case 'GET':
        return await handleGet(event)
      case 'DELETE':
        return await handleDelete(event)
      default:
        throw new Error(`Method ${method} not allowed`)
    }
  } catch (error) {
    logger.error('API error:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    }
  }
})

async function handleGet(event: any) {
  const query = getQuery(event)
  const { 
    id, 
    keyword, 
    source, 
    startDate, 
    endDate, 
    limit = '20', 
    offset = '0' 
  } = query

  if (id) {
    const article = await articleStorage.get(id as string)
    if (!article) {
      return { error: 'Article not found', status: 404 }
    }
    return { data: article }
  }

  // Search articles
  const searchQuery = {
    keyword: keyword as string,
    source: source as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  }

  const result = await articleStorage.search(searchQuery)
  return { data: result }
}

async function handleDelete(event: any) {
  const query = getQuery(event)
  const { id } = query
  
  if (!id) {
    return { error: 'Article ID required', status: 400 }
  }

  await articleStorage.delete(id as string)
  
  return { data: { success: true } }
}