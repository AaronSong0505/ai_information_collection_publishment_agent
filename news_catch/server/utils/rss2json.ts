import { XMLParser } from 'fast-xml-parser'
import type { RSSInfo, RSSItem } from '#/types'
import myFetch from './fetch.js'
import logger from './logger.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
})

export async function rss2json(url: string): Promise<RSSInfo | null> {
  try {
    const xml = await myFetch(url, { 
      headers: { 
        'Accept': 'application/rss+xml, application/xml, text/xml' 
      } 
    })
    
    const result = parser.parse(xml)
    const rss = result.rss || result.feed
    
    if (!rss) {
      logger.error('Invalid RSS format:', url)
      return null
    }

    const channel = rss.channel || rss
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean)
    
    const rssItems: RSSItem[] = items.map((item: any) => ({
      title: item.title || '',
      description: item.description || item.summary || '',
      link: item.link?.['@_href'] || item.link || '',
      created: item.pubDate || item.published || item.updated || '',
    }))

    return {
      title: channel.title || '',
      description: channel.description || '',
      link: channel.link?.['@_href'] || channel.link || '',
      image: channel.image?.url || '',
      updatedTime: channel.lastBuildDate || channel.updated || new Date().toISOString(),
      items: rssItems,
    }
  } catch (error) {
    logger.error('Failed to parse RSS:', url, error)
    return null
  }
}

export default rss2json