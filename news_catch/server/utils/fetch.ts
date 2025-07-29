import { ofetch } from 'ofetch'
import logger from './logger.js'

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

export const myFetch = ofetch.create({
  headers: DEFAULT_HEADERS,
  timeout: 30000,
  retry: 3,
  retryDelay: 1000,
  onRequestError({ error }) {
    logger.error('Request error:', error)
  },
  onResponseError({ response }) {
    logger.error('Response error:', response.status, response.statusText)
  },
})

export default myFetch