// 内容处理器 - 整合 Web Clipper 和图片标签功能
import { consola } from 'consola'
import { WebClipperAdapter } from '../clipper/web-clipper-adapter.js'
import { ObsidianClipperWrapper } from '../clipper/obsidian-clipper-wrapper.js'
import { ImageProcessor } from '../utils/image-processor.js'
import type { ArticleContent, ProcessingResult, ClipperOptions } from '../types/index.js'

export class ContentProcessor {
  private logger = consola.withTag('ContentProcessor')
  private clipper: WebClipperAdapter
  private obsidianClipper: ObsidianClipperWrapper
  private imageProcessor: ImageProcessor
  private useObsidianClipper: boolean

  constructor(
    clipperOptions?: ClipperOptions,
    imageBaseDir: string = './data/images',
    useObsidianClipper: boolean = true
  ) {
    this.clipper = new WebClipperAdapter(clipperOptions)
    this.obsidianClipper = new ObsidianClipperWrapper(clipperOptions)
    this.imageProcessor = new ImageProcessor(imageBaseDir)
    this.useObsidianClipper = useObsidianClipper
  }

  /**
   * 处理单个URL，提取内容并处理图片标签
   */
  async processUrl(url: string, source: string = 'unknown'): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      this.logger.info(`🔄 开始处理: ${url}`)

      // 1. 选择使用哪个 Clipper
      const clipperResult = this.useObsidianClipper 
        ? await this.obsidianClipper.extractContent(url)
        : await this.clipper.extractContent(url)

      // 2. 处理图片
      const articleId = this.generateArticleId(clipperResult.title)
      const { images, imageMap } = await this.imageProcessor.processImages(
        clipperResult.images,
        articleId
      )

      // 3. 在内容中插入图片标签
      const contentWithImageTags = this.insertImageTags(
        clipperResult.content,
        clipperResult.images,
        imageMap
      )

      // 4. 生成文章哈希
      const hash = this.generateContentHash(
        clipperResult.title,
        contentWithImageTags,
        url
      )

      // 5. 构建最终文章对象
      const article: ArticleContent = {
        title: clipperResult.title,
        content: contentWithImageTags,
        summary: this.generateSummary(contentWithImageTags),
        url: clipperResult.metadata.url,
        publishTime: clipperResult.metadata.publishTime || new Date(),
        source,
        author: clipperResult.metadata.author,
        hash,
        images,
        tags: this.extractTags(clipperResult.title, contentWithImageTags),
        imageMap
      }

      const processingTime = Date.now() - startTime

      this.logger.success(
        `✅ 处理完成: ${article.title} (${article.content.length} 字符, ${images.length} 张图片, ${processingTime}ms)`
      )

      return {
        success: true,
        article,
        processingTime
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      this.logger.error(`❌ 处理失败: ${url}`, error.message)

      return {
        success: false,
        error: error.message,
        processingTime
      }
    }
  }

  /**
   * 在内容中插入图片标签
   */
  private insertImageTags(
    content: string,
    imageUrls: string[],
    imageMap: Map<string, string>
  ): string {
    if (!imageUrls.length || !imageMap.size) {
      return content
    }

    let processedContent = content

    // 为每个图片URL查找对应的ID并替换
    imageUrls.forEach(imageUrl => {
      const imageId = imageMap.get(imageUrl)
      if (imageId) {
        // 创建图片标签
        const imageTag = `<|${imageId}|>`
        
        // 在内容中查找图片引用并替换
        // 这里使用简单的策略：在内容中查找图片URL或相关引用
        const imagePatterns = [
          new RegExp(`!\\[.*?\\]\\(${this.escapeRegex(imageUrl)}\\)`, 'g'), // Markdown图片
          new RegExp(`<img[^>]*src=["']${this.escapeRegex(imageUrl)}["'][^>]*>`, 'g'), // HTML图片
          new RegExp(this.escapeRegex(imageUrl), 'g') // 直接URL引用
        ]

        let replaced = false
        for (const pattern of imagePatterns) {
          if (pattern.test(processedContent)) {
            processedContent = processedContent.replace(pattern, imageTag)
            replaced = true
            break
          }
        }

        // 如果没有找到直接引用，在适当位置插入图片标签
        if (!replaced) {
          // 简单策略：在第一段后插入
          const firstParagraphEnd = processedContent.indexOf('\n\n')
          if (firstParagraphEnd > 0) {
            processedContent = 
              processedContent.slice(0, firstParagraphEnd) + 
              '\n\n' + imageTag + '\n\n' + 
              processedContent.slice(firstParagraphEnd + 2)
          } else {
            // 如果没有段落分隔，在内容末尾添加
            processedContent += '\n\n' + imageTag
          }
        }
      }
    })

    return processedContent
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 生成文章ID
   */
  private generateArticleId(title: string): string {
    const timestamp = Date.now()
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20)
    
    return `article-${timestamp}-${titleSlug}`
  }

  /**
   * 生成内容哈希
   */
  private generateContentHash(title: string, content: string, url: string): string {
    const crypto = require('crypto')
    const hashInput = `${title}|${content}|${url}`
    return crypto.createHash('md5').update(hashInput).digest('hex')
  }

  /**
   * 生成摘要
   */
  private generateSummary(content: string, maxLength: number = 300): string {
    // 移除图片标签后生成摘要
    const textContent = content.replace(/<\|[^|]+\|>/g, '').trim()
    
    if (textContent.length <= maxLength) {
      return textContent
    }

    // 在单词边界截断
    const truncated = textContent.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }

  /**
   * 提取标签
   */
  private extractTags(title: string, content: string): string[] {
    const tags = new Set<string>()

    // AI相关关键词
    const aiKeywords = [
      'AI', 'ai', '人工智能', '机器学习', '深度学习', 'ChatGPT', 'GPT', 'OpenAI',
      '大模型', 'LLM', '神经网络', '算法', 'TensorFlow', 'PyTorch', '自动驾驶',
      '计算机视觉', 'NLP', '自然语言', 'Transformer', 'BERT', '语言模型',
      '智能', '自动化', '机器人', 'ML', 'DL', '数据科学', '预测', '识别',
      'Claude', 'Gemini', 'Llama', '文心', '通义', '智谱', '百川', '讯飞'
    ]

    // 科技相关关键词
    const techKeywords = [
      '科技', '技术', '创新', '研发', '算力', '芯片', 'GPU', 'NVIDIA', 'AMD',
      '云计算', '边缘计算', '量子', '区块链', '元宇宙', 'VR', 'AR', 'XR',
      '5G', '6G', '物联网', 'IoT', '大数据', '数据库', '开源', '编程'
    ]

    const allKeywords = [...aiKeywords, ...techKeywords]
    const fullText = `${title} ${content}`.toLowerCase()

    allKeywords.forEach(keyword => {
      if (fullText.includes(keyword.toLowerCase())) {
        tags.add(keyword)
      }
    })

    // 默认标签
    tags.add('科技')
    tags.add('新闻')

    return Array.from(tags).slice(0, 10) // 限制标签数量
  }

  /**
   * 批量处理URL列表
   */
  async processBatch(
    urls: string[],
    source: string = 'batch',
    maxConcurrent: number = 3
  ): Promise<ProcessingResult[]> {
    this.logger.info(`🔄 开始批量处理 ${urls.length} 个URL (并发: ${maxConcurrent})`)

    const results: ProcessingResult[] = []
    
    // 分批处理以控制并发
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(url => 
        this.processUrl(url, source).catch(error => ({
          success: false,
          error: error.message,
          processingTime: 0
        }))
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 批次间延迟
      if (i + maxConcurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.filter(r => r.success).length
    this.logger.success(`✅ 批量处理完成: ${successCount}/${urls.length} 成功`)

    return results
  }
}