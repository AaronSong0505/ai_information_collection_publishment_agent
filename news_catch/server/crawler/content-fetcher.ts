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
    $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .comment').remove()
    
    // 尝试多种常见的内容选择器
    const contentSelectors = [
      'article .content',  // 36氪等网站
      '.article-content',
      '.post-content', 
      '.entry-content',
      '.content',
      'article',
      'main',
      '.story-body',
      '.article-body',
      '.post-body',
      '.rich_media_content',  // 微信公众号
      '#article-content'      // 通用ID选择器
    ]
    
    let content = ''
    let foundSelector = ''
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        // 获取文本内容并清理
        let textContent = element.text().trim()
        
        // 过滤掉太短的内容
        if (textContent.length > 100) {
          content = textContent
          foundSelector = selector
          break
        }
      }
    }
    
    // 如果没找到内容，尝试提取所有段落
    if (!content || content.length < 100) {
      const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
      const combinedContent = paragraphs.filter(p => p.length > 20).join('\n\n')
      
      if (combinedContent.length > 100) {
        content = combinedContent
      }
    }
    
    // 如果还是没有找到合适的内容，使用描述作为后备
    if (!content || content.length < 50) {
      content = description || title
    }
    
    // 清理内容
    content = content.replace(/\s+/g, ' ').trim()
    
    // 生成摘要（前300个字符）
    const summary = content.length > 300 ? content.substring(0, 300) + '...' : content
    
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
    
    logger.success(`✅ 内容抓取成功: ${title.substring(0, 30)}... (${content.length} 字符) 使用选择器: ${foundSelector || '段落组合'}`)
    return article
    
  } catch (error) {
    logger.warn(`⚠️ 内容抓取失败: ${title}`, error.message)
    
    // 如果抓取失败，返回基本信息
    const fallbackContent = description && description.length > 50 ? description : (title + ' - 来自' + source + '的完整文章内容。')
    return {
      title: title.trim(),
      content: fallbackContent,
      summary: fallbackContent.length > 300 ? fallbackContent.substring(0, 300) + '...' : fallbackContent,
      url,
      publishTime: new Date(),
      source,
      hash: generateContentHash(title, fallbackContent, url)
    }
  }
}