import { XMLParser } from 'fast-xml-parser'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'

interface RSSItem {
  title: string
  description: string
  link: string
  pubDate?: string
}

interface RSSFeed {
  title: string
  items: RSSItem[]
}

export async function parseRSSFeed(url: string): Promise<RSSFeed | null> {
  try {
    logger.info(`📡 抓取 RSS: ${url}`)
    
    const xml = await myFetch(url, { 
      headers: { 
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'NewsCatch/1.0 RSS Reader'
      },
      timeout: 15000
    })
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    })
    
    const result = parser.parse(xml)
    const rss = result.rss || result.feed
    
    if (!rss) {
      logger.error('❌ 无效的 RSS 格式')
      return null
    }

    const channel = rss.channel || rss
    let items = channel.item || channel.entry || []
    
    // 确保 items 是数组
    if (!Array.isArray(items)) {
      items = [items]
    }
    
    const rssItems: RSSItem[] = items.slice(0, 20).map((item: any) => ({
      title: item.title || '',
      description: item.description || item.summary || '',
      link: item.link?.['@_href'] || item.link || '',
      pubDate: item.pubDate || item.published || item.updated || '',
    })).filter((item: RSSItem) => item.title && item.link)

    logger.success(`✅ 解析成功，获得 ${rssItems.length} 条新闻`)
    
    return {
      title: channel.title || '',
      items: rssItems,
    }
  } catch (error) {
    logger.error(`❌ RSS 解析失败: ${url}`, error)
    return null
  }
}