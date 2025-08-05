import * as cheerio from 'cheerio'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { generateContentHash } from '../utils/hash.js'
import type { ImageInfo } from '../../shared/types.js'

export interface ArticleContent {
  title: string
  content: string
  summary: string
  url: string
  publishTime: Date
  source: string
  hash: string
}

export interface ContentImage {
  id: string
  originalUrl: string
  localPath: string
  format: string
  size: number
  width?: number
  height?: number
}

export async function fetchArticleContent(url: string, title: string, description: string, source: string, images: ContentImage[] = []): Promise<ArticleContent | null> {
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
    $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .comment, .related-article, .sidebar, .breadcrumb, .tags, .meta').remove()
    
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
      '#article-content',     // 通用ID选择器
      '.post-content .text',  // 一些博客平台
      '.article-main',        // 一些新闻网站
      '.news-content',        // 新闻内容类
      '.content-main',        // 主内容区域
      '.g-content',           // 一些网站的内容类
      '.detail-content',      // 详情页内容
      '.article-detail',      // 文章详情
      '.post_article',        // 另一种文章容器
      '.post-body-content',   // 另一种内容容器
      '.markdown-body',       // GitHub风格的Markdown内容
      '.article-content.markdown-body', // 掘金文章内容选择器
      'article .markdown-body' // 掘金文章内容选择器
    ]
    
    let contentElement = null
    let foundSelector = ''
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        // 检查元素是否包含足够的文本内容
        const textContent = element.text().trim()
        if (textContent.length > 100) {
          contentElement = element
          foundSelector = selector
          break
        }
      }
    }
    
    // 针对掘金网站的特殊处理
    if (!contentElement && url.includes('juejin.cn')) {
      logger.info('🔍 针对掘金网站进行特殊处理')
      // 掘金文章内容通常在.markdown-body类中
      const juejinContent = $('.markdown-body').first()
      if (juejinContent.length > 0 && juejinContent.text().trim().length > 100) {
        contentElement = juejinContent
        foundSelector = '.markdown-body (掘金特殊处理)'
      }
    }
    
    if (!contentElement) {
      logger.warn(`⚠️ 未找到合适的内容选择器，使用描述作为后备: ${title}`)
      // 如果没找到内容，使用描述作为后备
      const content = description || title
      const summary = content.length > 300 ? content.substring(0, 300) + '...' : content
      const hash = generateContentHash(title, content, url)
      
      return {
        title: title.trim(),
        content,
        summary,
        url,
        publishTime: new Date(),
        source,
        hash
      }
    }
    
    // 提取正文中的图片信息并插入带ID的占位符
    contentElement.find('img').each((index, img) => {
      const $img = $(img)
      let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original')
      const alt = $img.attr('alt') || ''
      
      if (src) {
        // 处理相对路径
        if (src.startsWith('//')) {
          src = 'https:' + src
        } else if (src.startsWith('/')) {
          const baseUrl = new URL(url)
          src = baseUrl.origin + src
        } else if (!src.startsWith('http')) {
          src = new URL(src, url).href
        }
        
        // 过滤掉明显不是内容图片的图片
        if (!src.includes('ad') && !src.includes('banner') && !src.includes('tracking') && 
            !src.includes('/t.png') && // IT之家的追踪像素
            !alt.includes('广告') && !alt.includes('ad') &&
            !src.includes('pixel') && !src.includes('blank')) {
          // 查找匹配的图片ID
          const matchedImage = images.find(img => img.originalUrl === src || img.originalUrl.split('?')[0] === src.split('?')[0])
          if (matchedImage) {
            // 在图片位置插入带ID的占位符
            $img.replaceWith(`<<<${matchedImage.id}>>>`)
          } else {
            // 如果没有匹配的图片，使用通用占位符
            $img.replaceWith(`<<<image>>>`)
          }
        } else {
          // 移除非内容图片
          $img.remove()
        }
      }
    })
    
    // 获取处理后的内容，保留HTML结构以获取更好的文本格式
    let content = contentElement.text().trim()
    
    // 清理内容，移除多余的空白字符和特殊符号
    content = content.replace(/\s+/g, ' ').trim()
    
    // 如果内容太短，尝试获取所有段落
    if (content.length < 200) {
      const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
      const combinedContent = paragraphs.filter(p => p.length > 20).join('\n\n')
      
      if (combinedContent.length > content.length) {
        content = combinedContent.replace(/\s+/g, ' ').trim()
      }
    }
    
    // 如果仍然内容太短，尝试获取所有文本内容
    if (content.length < 100) {
      // 获取所有文本内容，但排除明显的无关内容
      const allTextElements = contentElement.find('*').not('script, style, nav, header, footer, .advertisement, .ads, .social-share, .comment, .sidebar, .related-article, .breadcrumb, .tags, .meta');
      const allText = allTextElements.map((i, el) => $(el).text().trim()).get()
        .filter(text => text.length > 20)
        .join('\n\n');
      
      if (allText.length > content.length) {
        content = allText.replace(/\s+/g, ' ').trim();
      }
    }
    
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
    
    logger.success(`✅ 内容抓取成功: ${title.substring(0, 30)}... (${content.length} 字符) 使用选择器: ${foundSelector}`)
    return article
    
  } catch (error) {
    logger.warn(`⚠️ 内容抓取失败: ${title}`, error.message)
    
    // 如果抓取失败，返回基本信息
    const content = description || title
    const summary = content.length > 300 ? content.substring(0, 300) + '...' : content
    const hash = generateContentHash(title, content, url)
    
    return {
      title: title.trim(),
      content,
      summary,
      url,
      publishTime: new Date(),
      source,
      hash
    }
  }
}