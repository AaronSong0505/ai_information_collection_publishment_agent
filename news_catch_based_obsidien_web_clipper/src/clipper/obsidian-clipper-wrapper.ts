// Obsidian Web Clipper 包装器 - 直接复用现有代码
import { consola } from 'consola'
import { ofetch } from 'ofetch'
import type { ClipperOptions, ClipperResult } from '../types/index.js'

// 注意：这些导入需要在 setup 脚本运行后才能工作
// import { createMarkdownContent } from '../../obsidian-clipper/src/utils/markdown-converter.js'
// import { initializePageContent } from '../../obsidian-clipper/src/utils/content-extractor.js'

export class ObsidianClipperWrapper {
  private logger = consola.withTag('ObsidianClipper')

  constructor(private options: ClipperOptions = {
    includeImages: true,
    preserveFormatting: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }) {}

  /**
   * 使用 Obsidian Web Clipper 的核心功能提取内容
   */
  async extractContent(url: string): Promise<ClipperResult> {
    try {
      this.logger.info(`🔍 使用 Obsidian Web Clipper 提取内容: ${url}`)

      // 1. 获取网页内容
      const html = await this.fetchHtml(url)
      
      // 2. 模拟浏览器环境，准备数据
      const mockPageData = await this.prepareMockPageData(html, url)
      
      // 3. 动态导入 Obsidian Web Clipper 的核心函数
      const { initializePageContent } = await import('../../obsidian-clipper/src/utils/content-extractor.js')
      const { createMarkdownContent } = await import('../../obsidian-clipper/src/utils/markdown-converter.js')
      
      const { noteName, currentVariables } = await initializePageContent(
        mockPageData.content,
        mockPageData.selectedHtml,
        mockPageData.extractedContent,
        url,
        mockPageData.schemaOrgData,
        mockPageData.fullHtml,
        mockPageData.highlights,
        mockPageData.title,
        mockPageData.author,
        mockPageData.description,
        mockPageData.favicon,
        mockPageData.image,
        mockPageData.published,
        mockPageData.site,
        mockPageData.wordCount,
        mockPageData.metaTags
      )

      // 4. 使用 Obsidian 的 Markdown 转换器
      const markdownContent = createMarkdownContent(mockPageData.content, url)

      this.logger.success(`✅ 内容提取完成: ${mockPageData.title}`)

      return {
        title: mockPageData.title,
        content: markdownContent,
        images: this.extractImageUrls(mockPageData.content),
        metadata: {
          url,
          publishTime: new Date(mockPageData.published),
          author: mockPageData.author,
          description: mockPageData.description,
          variables: currentVariables // Obsidian 的变量系统
        }
      }

    } catch (error) {
      this.logger.error(`❌ 内容提取失败: ${url}`, error)
      throw error
    }
  }

  /**
   * 获取网页 HTML
   */
  private async fetchHtml(url: string): Promise<string> {
    return await ofetch(url, {
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent
      }
    })
  }

  /**
   * 准备模拟的页面数据，兼容 Obsidian Web Clipper 的接口
   */
  private async prepareMockPageData(html: string, url: string) {
    // 这里我们需要将 HTML 解析成 Obsidian Web Clipper 期望的格式
    // 可以使用 JSDOM 或 cheerio 来模拟浏览器环境
    
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // 提取基本信息
    const title = this.extractTitle(document)
    const author = this.extractAuthor(document)
    const description = this.extractDescription(document)
    const published = this.extractPublishDate(document)
    const site = new URL(url).hostname
    const favicon = this.extractFavicon(document, url)
    const image = this.extractMainImage(document, url)

    // 提取主要内容
    const content = this.extractMainContent(document)
    const wordCount = this.countWords(content)

    // 提取元数据
    const metaTags = this.extractMetaTags(document)
    const schemaOrgData = this.extractSchemaOrgData(document)

    return {
      content,
      selectedHtml: '',
      extractedContent: {},
      schemaOrgData,
      fullHtml: html,
      highlights: [], // 暂时为空，后续可以添加高亮功能
      title,
      author,
      description,
      favicon,
      image,
      published,
      site,
      wordCount,
      metaTags
    }
  }

  private extractTitle(document: Document): string {
    return document.querySelector('title')?.textContent?.trim() || 
           document.querySelector('h1')?.textContent?.trim() || 
           'Untitled'
  }

  private extractAuthor(document: Document): string {
    const authorSelectors = [
      '[name="author"]',
      '[property="article:author"]',
      '.author',
      '.byline'
    ]

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const author = element.getAttribute('content') || element.textContent
        if (author?.trim()) return author.trim()
      }
    }

    return ''
  }

  private extractDescription(document: Document): string {
    const descSelectors = [
      '[name="description"]',
      '[property="og:description"]',
      '[name="twitter:description"]'
    ]

    for (const selector of descSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const desc = element.getAttribute('content')
        if (desc?.trim()) return desc.trim()
      }
    }

    return ''
  }

  private extractPublishDate(document: Document): string {
    const dateSelectors = [
      '[property="article:published_time"]',
      '[name="publish_date"]',
      'time[datetime]'
    ]

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const date = element.getAttribute('content') || element.getAttribute('datetime')
        if (date) return date
      }
    }

    return new Date().toISOString()
  }

  private extractFavicon(document: Document, url: string): string {
    const faviconEl = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')
    if (faviconEl) {
      const href = faviconEl.getAttribute('href')
      if (href) {
        return new URL(href, url).href
      }
    }
    return `${new URL(url).origin}/favicon.ico`
  }

  private extractMainImage(document: Document, url: string): string {
    const imageSelectors = [
      '[property="og:image"]',
      '[name="twitter:image"]',
      'article img',
      '.content img'
    ]

    for (const selector of imageSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const src = element.getAttribute('content') || element.getAttribute('src')
        if (src) {
          return new URL(src, url).href
        }
      }
    }

    return ''
  }

  private extractMainContent(document: Document): string {
    const contentSelectors = [
      'article',
      '.content',
      '.post-content',
      '.entry-content',
      '[class*="content"]',
      'main'
    ]

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element && element.innerHTML.trim().length > 100) {
        return element.innerHTML
      }
    }

    // 如果没有找到特定内容区域，使用 body
    return document.body.innerHTML
  }

  private countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, '').trim()
    return text.split(/\s+/).length
  }

  private extractMetaTags(document: Document) {
    const metaTags: { name?: string | null; property?: string | null; content: string | null }[] = []
    
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name')
      const property = meta.getAttribute('property')
      const content = meta.getAttribute('content')

      if ((name || property) && content) {
        metaTags.push({ name, property, content })
      }
    })

    return metaTags
  }

  private extractSchemaOrgData(document: Document): any {
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]')
    const schemaData: any[] = []

    schemaScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '')
        schemaData.push(data)
      } catch (error) {
        // 忽略解析错误
      }
    })

    return schemaData.length > 0 ? schemaData : null
  }

  private extractImageUrls(html: string): string[] {
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM(html)
    const images: string[] = []

    dom.window.document.querySelectorAll('img').forEach((img: any) => {
      const src = img.getAttribute('src')
      if (src && !images.includes(src)) {
        images.push(src)
      }
    })

    return images
  }
}