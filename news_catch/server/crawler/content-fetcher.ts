import * as cheerio from 'cheerio'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { generateContentHash } from '../utils/hash.js'

export interface ArticleContent {
  title: string
  content: string
  summary: string
  url: string
  publishTime: Date
  source: string
  hash: string
}

export async function fetchArticleContent(url: string, title: string, description: string, source: string): Promise<ArticleContent | null> {
  try {
    logger.info(`📄 抓取文章内容: ${title.substring(0, 50)}...`)
    
    const html = await myFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 20000
    })
    
    const $ = cheerio.load(html)
    
    // 移除不需要的元素
    $('script, style, nav, header, footer, .advertisement, .ads, .social-share').remove()
    
    // 尝试多种常见的内容选择器
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content', 
      '.entry-content',
      '.content',
      'main',
      '.story-body',
      '.article-body'
    ]
    
    let content = ''
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        content = element.text().trim()
        if (content.length > 200) { // 确保内容足够长
          break
        }
      }
    }
    
    // 如果没有找到合适的内容，使用描述
    if (!content || content.length < 100) {
      content = description || title
    }
    
    // 清理内容
    content = content.replace(/\s+/g, ' ').trim()
    
    // 生成摘要（前200个字符）
    const summary = content.length > 200 ? content.substring(0, 200) + '...' : content
    
    // 生成内容哈希用于去重
    const hash = generateContentHash(title, content, url)
    
    const article: ArticleContent = {
      title: title.trim(),
      content,
      summary,
      url,
      publishTime: new Date(),
      source,
      hash
    }
    
    logger.success(`✅ 内容抓取成功: ${title.substring(0, 30)}... (${content.length} 字符)`)
    return article
    
  } catch (error) {
    logger.warn(`⚠️ 内容抓取失败: ${title}`, error.message)
    
    // 如果抓取失败，返回基本信息
    return {
      title: title.trim(),
      content: description || title,
      summary: description ? description.substring(0, 200) + '...' : title,
      url,
      publishTime: new Date(),
      source,
      hash: generateContentHash(title, description || title, url)
    }
  }
}