import * as cheerio from 'cheerio'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { generateContentHash } from '../utils/hash.js'
import type { ImageInfo } from "@shared/types"

export interface ArticleContent {
  title: string
  content: string
  summary: string
  url: string
  publishTime: Date
  source: string
  hash: string
  imageMap?: Map<string, string> // 图片URL到ID的映射
}

/**
 * 抓取文章内容并处理图片标签
 * @param url 文章URL
 * @param title 文章标题
 * @param description 文章描述
 * @param source 来源
 * @param imageMap 图片URL到ID的映射（可选）
 */
export async function fetchArticleContentWithImages(
  url: string, 
  title: string, 
  description: string, 
  source: string,
  imageMap?: Map<string, string>
): Promise<ArticleContent | null> {
  try {
    logger.info(`📄 抓取文章内容（含图片处理）: ${title.substring(0, 50)}...`)
    
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
    
    let contentElement: cheerio.Cheerio<cheerio.Element> | null = null
    let foundSelector = ''
    
    // 找到最合适的内容容器
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const textContent = element.text().trim()
        if (textContent.length > 100) {
          contentElement = element
          foundSelector = selector
          break
        }
      }
    }
    
    let content = ''
    
    if (contentElement && contentElement.length > 0) {
      // 处理内容并替换图片
      content = processContentWithImages(contentElement, imageMap)
    } else {
      // 如果没找到内容容器，尝试提取所有段落和图片
      content = processAllContentWithImages($, imageMap)
    }
    
    // 如果还是没有找到合适的内容，使用描述作为后备
    if (!content || content.length < 50) {
      content = description || title
    }
    
    // 清理内容
    content = content.replace(/\s+/g, ' ').trim()
    
    // 生成摘要（前300个字符，但要避免截断图片标签）
    const summary = generateSummaryWithImageTags(content, 300)
    
    // 生成内容哈希用于去重
    const hash = generateContentHash(title, content, url)
    
    const article: ArticleContent = {
      title: title.trim(),
      content,
      summary,
      url,
      publishTime: new Date(),
      source,
      hash,
      imageMap
    }
    
    const imageCount = imageMap ? imageMap.size : 0
    logger.success(`✅ 内容抓取成功: ${title.substring(0, 30)}... (${content.length} 字符, ${imageCount} 张图片) 使用选择器: ${foundSelector || '段落组合'}`)
    return article
    
  } catch (error) {
    logger.warn(`⚠️ 内容抓取失败: ${title}`, (error as Error).message)
    
    // 如果抓取失败，返回基本信息
    const fallbackContent = description && description.length > 50 ? description : (title + ' - 来自' + source + '的完整文章内容。')
    return {
      title: title.trim(),
      content: fallbackContent,
      summary: fallbackContent.length > 300 ? fallbackContent.substring(0, 300) + '...' : fallbackContent,
      url,
      publishTime: new Date(),
      source,
      hash: generateContentHash(title, fallbackContent, url),
      imageMap
    }
  }
}

/**
 * 处理内容元素中的文本和图片
 */
function processContentWithImages(
  contentElement: cheerio.Cheerio<cheerio.Element>, 
  imageMap?: Map<string, string>
): string {
  if (!contentElement || contentElement.length === 0) {
    return ''
  }
  
  // 创建一个新的cheerio实例来处理HTML
  const html = contentElement.html() || ''
  const $ = cheerio.load(html)
  
  // 处理所有图片，替换为标签
  $('img').each((index, element) => {
    const $img = $(element)
    const imgSrc = $img.attr('data-src') || $img.attr('data-original') || $img.attr('src')
    
    if (imgSrc && imageMap) {
      const imageId = getImageIdFromUrl(imgSrc, imageMap)
      if (imageId) {
        // 用图片标签替换img元素
        $img.replaceWith(`<|${imageId}|>`)
      }
    }
  })
  
  // 获取处理后的文本内容
  const textContent = $.text().trim()
  
  return textContent.replace(/\s+/g, ' ').trim()
}

/**
 * 处理整个页面的内容和图片（当找不到特定内容容器时）
 */
function processAllContentWithImages($: cheerio.CheerioAPI, imageMap?: Map<string, string>): string {
  // 先处理所有图片，替换为标签
  $('img').each((index, element) => {
    const $img = $(element)
    const imgSrc = $img.attr('data-src') || $img.attr('data-original') || $img.attr('src')
    
    if (imgSrc && imageMap) {
      const imageId = getImageIdFromUrl(imgSrc, imageMap)
      if (imageId) {
        // 用图片标签替换img元素
        $img.replaceWith(`<|${imageId}|>`)
      }
    }
  })
  
  const parts: string[] = []
  
  // 获取所有段落（现在包含图片标签）
  $('p').each((index, element) => {
    const $p = $(element)
    const text = $p.text().trim()
    
    if (text.length > 20) {
      parts.push(text)
    }
  })
  
  // 如果没有段落，尝试获取body或其他容器的文本
  if (parts.length === 0) {
    const bodyText = $('body').text().trim() || $.text().trim()
    if (bodyText.length > 50) {
      parts.push(bodyText)
    }
  }
  
  return parts.join('\n\n').replace(/\s+/g, ' ').trim()
}

/**
 * 从图片URL获取对应的图片ID
 */
function getImageIdFromUrl(imgSrc: string, imageMap: Map<string, string>): string | null {
  // 处理相对路径
  let fullUrl = imgSrc
  if (imgSrc.startsWith('//')) {
    fullUrl = 'https:' + imgSrc
  }
  
  return imageMap.get(fullUrl) || imageMap.get(imgSrc) || null
}

/**
 * 生成包含图片标签的摘要，避免截断图片标签
 */
function generateSummaryWithImageTags(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }
  
  // 找到最后一个完整的图片标签位置
  let cutPosition = maxLength
  const imageTagRegex = /<\|[^|]+\|>/g
  let match
  
  while ((match = imageTagRegex.exec(content)) !== null) {
    if (match.index < maxLength && match.index + match[0].length > maxLength) {
      // 图片标签跨越了截断位置，调整截断位置到标签之前
      cutPosition = match.index
      break
    } else if (match.index + match[0].length <= maxLength) {
      // 图片标签完全在截断位置之前，可以包含
      cutPosition = Math.max(cutPosition, match.index + match[0].length)
    }
  }
  
  return content.substring(0, cutPosition) + '...'
}

// 保持原有的函数作为向后兼容
export async function fetchArticleContent(url: string, title: string, description: string, source: string): Promise<ArticleContent | null> {
  return fetchArticleContentWithImages(url, title, description, source)
}