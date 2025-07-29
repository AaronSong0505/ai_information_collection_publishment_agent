import * as cheerio from 'cheerio'
import type { NewsItem, NewsSource } from "@shared/types"
import logger from "../utils/logger.js"

export class ContentParser {
  async parseHTML(html: string, source: NewsSource): Promise<NewsItem[]> {
    const $ = cheerio.load(html)
    const items: NewsItem[] = []
    
    const { selectors } = source.config
    if (!selectors) {
      throw new Error('HTML selectors not configured for source')
    }

    // Find all article containers
    const articleSelector = selectors.title || 'article, .article, .news-item'
    $(articleSelector).each((index, element) => {
      try {
        const $el = $(element)
        
        const title = this.extractText($el, selectors.title || 'h1, h2, h3, .title')
        const url = this.extractUrl($el, selectors.link || 'a')
        const content = this.extractText($el, selectors.content || '.content, .description, p')
        const dateStr = this.extractText($el, selectors.date || '.date, .time, time')
        const imageUrl = this.extractImageUrl($el, selectors.image || 'img')

        if (title && url) {
          items.push({
            id: url,
            title: title.trim(),
            url: this.resolveUrl(url, source.url),
            content: content?.trim(),
            pubDate: dateStr,
            source: source.id,
            images: imageUrl ? [{ 
              id: `${source.id}-${index}`,
              originalUrl: this.resolveUrl(imageUrl, source.url),
              localPath: '',
              format: this.getImageFormat(imageUrl),
              size: 0
            }] : [],
          })
        }
      } catch (error) {
        logger.warn(`Failed to parse article at index ${index}:`, error)
      }
    })

    return items
  }

  async parseAPI(data: any, source: NewsSource): Promise<NewsItem[]> {
    const items: NewsItem[] = []
    
    // Handle different API response formats
    let articles = data
    if (data.data) articles = data.data
    if (data.items) articles = data.items
    if (data.articles) articles = data.articles
    
    if (!Array.isArray(articles)) {
      throw new Error('API response is not an array or does not contain an array')
    }

    articles.forEach((item: any, index: number) => {
      try {
        const title = item.title || item.headline || item.name
        const url = item.url || item.link || item.href
        const content = item.content || item.description || item.summary
        const pubDate = item.publishedAt || item.published || item.date || item.created_at
        const author = item.author || item.by
        const imageUrl = item.image || item.thumbnail || item.cover

        if (title && url) {
          items.push({
            id: item.id || url,
            title: title.trim(),
            url,
            content: content?.trim(),
            pubDate,
            author,
            source: source.id,
            images: imageUrl ? [{
              id: `${source.id}-${index}`,
              originalUrl: imageUrl,
              localPath: '',
              format: this.getImageFormat(imageUrl),
              size: 0
            }] : [],
          })
        }
      } catch (error) {
        logger.warn(`Failed to parse API item at index ${index}:`, error)
      }
    })

    return items
  }

  async extractContent(html: string, source: NewsSource): Promise<string> {
    const $ = cheerio.load(html)
    
    const { selectors } = source.config
    const contentSelector = selectors?.content || 'article, .article-content, .content, .post-content, main'
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .advertisement, .ads').remove()
    
    const content = $(contentSelector).first().text()
    return content.replace(/\s+/g, ' ').trim()
  }

  private extractText($el: cheerio.Cheerio<cheerio.Element>, selector: string): string {
    const element = $el.find(selector).first()
    if (element.length === 0) {
      // If selector not found in element, try the element itself
      return $el.is(selector) ? $el.text() : ''
    }
    return element.text()
  }

  private extractUrl($el: cheerio.Cheerio<cheerio.Element>, selector: string): string {
    const element = $el.find(selector).first()
    if (element.length === 0) {
      return $el.is('a') ? $el.attr('href') || '' : ''
    }
    return element.attr('href') || element.attr('src') || ''
  }

  private extractImageUrl($el: cheerio.Cheerio<cheerio.Element>, selector: string): string {
    const element = $el.find(selector).first()
    if (element.length === 0) {
      return $el.is('img') ? $el.attr('src') || '' : ''
    }
    return element.attr('src') || element.attr('data-src') || ''
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (!url) return ''
    
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    return extension || 'jpg'
  }
}

export default ContentParser