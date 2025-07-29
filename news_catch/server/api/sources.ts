import { defineEventHandler, readBody, getQuery } from 'h3'
import { SourceStorage } from '../database/sources.js'
import useDatabase from '../database/index.js'
import logger from '../utils/logger.js'

const sourceStorage = new SourceStorage(useDatabase())

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  try {
    switch (method) {
      case 'GET':
        return await handleGet(event)
      case 'POST':
        return await handlePost(event)
      case 'PUT':
        return await handlePut(event)
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
  const { id } = query

  if (id) {
    const source = await sourceStorage.get(id as string)
    if (!source) {
      return { error: 'Source not found', status: 404 }
    }
    return { data: source }
  }

  const sources = await sourceStorage.getAll()
  return { data: sources }
}

async function handlePost(event: any) {
  const body = await readBody(event)
  
  const { name, url, type, config, enabled = true, interval = 300 } = body
  
  if (!name || !url || !type) {
    return { error: 'Missing required fields: name, url, type', status: 400 }
  }

  const sourceId = await sourceStorage.add({
    name,
    url,
    type,
    config: config || {},
    enabled,
    interval,
  })

  return { data: { id: sourceId }, status: 201 }
}

async function handlePut(event: any) {
  const query = getQuery(event)
  const { id } = query
  
  if (!id) {
    return { error: 'Source ID required', status: 400 }
  }

  const body = await readBody(event)
  await sourceStorage.update(id as string, body)
  
  return { data: { success: true } }
}

async function handleDelete(event: any) {
  const query = getQuery(event)
  const { id } = query
  
  if (!id) {
    return { error: 'Source ID required', status: 400 }
  }

  await sourceStorage.delete(id as string)
  
  return { data: { success: true } }
}