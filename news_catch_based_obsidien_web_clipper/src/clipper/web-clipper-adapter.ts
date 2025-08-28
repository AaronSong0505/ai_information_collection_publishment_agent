// 简单 Web Clipper 适配器 - 备用方案
import * as cheerio from 'cheerio'
import { consola } from 'consola'
import { NetworkHelper } from '../utils/network-helper.js'
import type { ClipperOptions, ClipperResult } from '../types/index.js'

/**
 * 简单的 Web Clipper 实现 - 作为 Obsidian Clipper 的备用方案
 * 注意：推荐使用 ObsidianClipperWrapper 获得更好的效果
 */
export class WebClipperAdapter {
  private logger = consola.withTag('SimpleWebClipper')

  constructor(private options: ClipperOptions = {
    includeImages: true,
    preserveFormatting: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }) {}

  /**
   * 从URL提取内容 - 模拟 Obsidian Web Clipper 的核心功能
   */
  async extractContent(url: string, customOptions?: Partial<ClipperOptions>): Promise<ClipperResult> {
    const opts = { ...this.options, ...customOptions }
    
    this.logger.info(`🔍 开始提取内容: ${url}`)
    
    try {
      // 获取页面HTML（带重试机制）
      const html = await NetworkHelper.fetchHTML(url, {
        timeout: opts.timeout,
        userAgent: opts.userAgent!,
        maxRetries: 3,
        retryDelay: 2000
      })

      // 等待一段时间，让动态内容有时间加载
      await this.delay(2000)

      const $ = cheerio.load(html)
      
      // 清理不需要的元素
      this.cleanupDocument($)
      
      // 提取核心内容
      const result = await this.extractCoreContent($, url)
      
      this.logger.success(`✅ 内容提取成功: ${result.title} (${result.content.length} 字符, ${result.images.length} 张图片)`)
      
      return result
      
    } catch (error: any) {
      this.logger.error(`❌ 内容提取失败: ${url}`, error)
      throw new Error(`Failed to extract content from ${url}: ${error.message}`)
    }
  }

  /**
   * 清理文档 - 移除不需要的元素
   */
  private cleanupDocument($: cheerio.CheerioAPI): void {
    // 移除脚本、样式和其他不需要的元素
    $(
      'script, style, noscript, iframe, embed, object, ' +
      'nav, header, footer, aside, ' +
      '.advertisement, .ads, .ad, .banner, ' +
      '.social-share, .share-buttons, ' +
      '.comment, .comments, .comment-section, ' +
      '.sidebar, .related-articles, ' +
      '.newsletter, .subscription, ' +
      '.popup, .modal, .overlay'
    ).remove()

    // 移除隐藏元素
    $('[style*="display:none"], [style*="display: none"]').remove()
    $('.hidden, .hide').remove()
  }

  /**
   * 提取核心内容
   */
  private async extractCoreContent($: cheerio.CheerioAPI, url: string): Promise<ClipperResult> {
    // 提取标题
    const title = this.extractTitle($)
    
    // 提取主要内容
    const content = this.extractMainContent($)
    
    // 提取图片
    const images = this.options.includeImages ? this.extractImages($, url) : []
    
    // 提取元数据
    const metadata = this.extractMetadata($, url)
    
    return {
      title,
      content,
      images,
      metadata
    }
  }

  /**
   * 提取标题
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // 尝试多种标题选择器
    const titleSelectors = [
      'h1',
      '.title',
      '.article-title',
      '.post-title',
      '.entry-title',
      '[class*="title"]',
      'title'
    ]

    for (const selector of titleSelectors) {
      const titleElement = $(selector).first()
      if (titleElement.length > 0) {
        const title = titleElement.text().trim()
        if (title && title.length > 5) {
          return title
        }
      }
    }

    // 如果没找到，使用页面title
    return $('title').text().trim() || 'Untitled'
  }

  /**
   * 提取主要内容
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // 尝试多种内容选择器，按优先级排序
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content',
      '.story-body',
      '.article-body',
      '.post-body',
      '[class*="content"]',
      '[class*="article"]',
      '[class*="post"]'
    ]

    for (const selector of contentSelectors) {
      const contentElement = $(selector).first()
      if (contentElement.length > 0) {
        const content = this.processContentElement(contentElement)
        if (content && content.length > 100) {
          return content
        }
      }
    }

    // 如果没找到主要内容区域，尝试提取所有段落
    const paragraphs: string[] = []
    $('p').each((_, element) => {
      const text = $(element).text().trim()
      if (text.length > 20) {
        paragraphs.push(text)
      }
    })

    return paragraphs.join('\n\n') || 'No content found'
  }

  /**
   * 处理内容元素
   */
  private processContentElement(element: cheerio.Cheerio<cheerio.Element>): string {
    // 移除不需要的子元素
    element.find('script, style, .advertisement, .ads, .social-share').remove()
    
    if (this.options.preserveFormatting) {
      // 保持基本格式
      return this.convertToMarkdown(element)
    } else {
      // 纯文本
      return element.text().trim()
    }
  }

  /**
   * 简单的HTML到Markdown转换
   */
  private convertToMarkdown(element: cheerio.Cheerio<cheerio.Element>): string {
    let content = element.html() || ''
    
    // 基本的HTML到Markdown转换
    content = content
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => {
        const hashes = '#'.repeat(parseInt(level))
        return `\n${hashes} ${text.trim()}\n`
      })
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![image]($1)')
      .replace(/<[^>]+>/g, '') // 移除剩余的HTML标签
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 清理多余的空行
      .trim()

    return content
  }

  /**
   * 提取图片
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = []
    const seenUrls = new Set<string>()

    $('img').each((_, element) => {
      const $img = $(element)
      let imgSrc = $img.attr('data-src') || 
                   $img.attr('data-original') || 
                   $img.attr('data-lazy-src') ||
                   $img.attr('src')

      if (imgSrc) {
        // 处理相对路径
        if (imgSrc.startsWith('//')) {
          imgSrc = 'https:' + imgSrc
        } else if (imgSrc.startsWith('/')) {
          const urlObj = new URL(baseUrl)
          imgSrc = urlObj.origin + imgSrc
        } else if (!imgSrc.startsWith('http')) {
          imgSrc = new URL(imgSrc, baseUrl).href
        }

        // 过滤无效图片
        if (this.isValidImageUrl(imgSrc) && !seenUrls.has(imgSrc)) {
          images.push(imgSrc)
          seenUrls.add(imgSrc)
        }
      }
    })

    return images
  }

  /**
   * 验证图片URL是否有效
   */
  private isValidImageUrl(url: string): boolean {
    // 过滤掉明显无效的图片
    const invalidPatterns = [
      'data:image/svg+xml',
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP', // 1x1透明图片
      'placeholder',
      'loading.gif',
      'spinner',
      'icon-',
      'logo-small',
      'avatar-default',
      'img-placeholder', // 少数派的占位图
      'logo_sspai_icon', // 少数派的小图标
      'thumbnail/!72x72r', // 小头像
      'thumbnail/!84x84r', // 小头像
      'qrcode_service', // 二维码
      'ui/img-placeholder', // UI占位图
      'avatar/', // 头像目录
      'icon.png', // 通用图标
      'logo.png', // 通用logo
      '.gif?imageMogr2/auto-orient/quality/90/ignore-error/1' // 可能的动态图标
    ]

    // 检查URL是否有效
    if (!url || url.length > 2000 || !url.startsWith('http')) {
      return false
    }

    // 检查是否包含无效模式
    if (invalidPatterns.some(pattern => url.includes(pattern))) {
      return false
    }

    // 检查文件扩展名
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url)
    
    // 检查图片尺寸参数，过滤掉太小的图片
    const hasTinySize = /thumbnail\/![0-9]{1,2}x[0-9]{1,2}r/.test(url) || // 小于100x100的缩略图
                       /w_[0-9]{1,2}[^0-9]/.test(url) || // 宽度小于100的图片
                       /h_[0-9]{1,2}[^0-9]/.test(url)   // 高度小于100的图片

    return hasValidExtension && !hasTinySize
  }

  /**
   * 提取元数据
   */
  private extractMetadata($: cheerio.CheerioAPI, url: string): ClipperResult['metadata'] {
    // 提取发布时间
    const publishTime = this.extractPublishTime($)
    
    // 提取作者
    const author = this.extractAuthor($)
    
    // 提取描述
    const description = this.extractDescription($)

    return {
      url,
      publishTime,
      author,
      description
    }
  }

  /**
   * 提取发布时间
   */
  private extractPublishTime($: cheerio.CheerioAPI): Date | undefined {
    const timeSelectors = [
      'time[datetime]',
      '.publish-time',
      '.post-date',
      '.article-date',
      '[class*="time"]',
      '[class*="date"]'
    ]

    for (const selector of timeSelectors) {
      const timeElement = $(selector).first()
      if (timeElement.length > 0) {
        const datetime = timeElement.attr('datetime') || timeElement.text().trim()
        const date = new Date(datetime)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    return undefined
  }

  /**
   * 提取作者
   */
  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const authorSelectors = [
      '.author',
      '.byline',
      '.post-author',
      '.article-author',
      '[class*="author"]',
      '[rel="author"]'
    ]

    for (const selector of authorSelectors) {
      const authorElement = $(selector).first()
      if (authorElement.length > 0) {
        const author = authorElement.text().trim()
        if (author && author.length > 1 && author.length < 100) {
          return author
        }
      }
    }

    return undefined
  }

  /**
   * 提取描述
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // 尝试meta描述
    const metaDesc = $('meta[name="description"]').attr('content') ||
                     $('meta[property="og:description"]').attr('content')
    
    if (metaDesc && metaDesc.trim().length > 10) {
      return metaDesc.trim()
    }

    // 尝试第一段
    const firstParagraph = $('p').first().text().trim()
    if (firstParagraph && firstParagraph.length > 20) {
      return firstParagraph.length > 200 ? 
             firstParagraph.substring(0, 200) + '...' : 
             firstParagraph
    }

    return undefined
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}