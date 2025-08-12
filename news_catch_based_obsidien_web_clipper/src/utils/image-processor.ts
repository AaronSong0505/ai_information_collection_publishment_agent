// 图片处理器 - 复用现有的图片标签功能
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { ofetch } from 'ofetch'
import { consola } from 'consola'
import type { ImageInfo } from '../types/index.js'

export class ImageProcessor {
  private logger = consola.withTag('ImageProcessor')
  private baseDir: string

  constructor(baseDir: string = './data/images') {
    this.baseDir = baseDir
  }

  /**
   * 处理图片列表，下载并生成标签映射
   */
  async processImages(imageUrls: string[], articleId: string): Promise<{
    images: ImageInfo[]
    imageMap: Map<string, string>
  }> {
    if (!imageUrls || imageUrls.length === 0) {
      return { images: [], imageMap: new Map() }
    }

    this.logger.info(`🖼️ 开始处理 ${imageUrls.length} 张图片...`)

    const images: ImageInfo[] = []
    const imageMap = new Map<string, string>()
    let successCount = 0

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      
      try {
        const imageInfo = await this.downloadImage(imageUrl, articleId, i)
        if (imageInfo) {
          images.push(imageInfo)
          
          // 建立URL到ID的映射
          imageMap.set(imageUrl, imageInfo.id)
          
          // 处理URL变体
          this.addUrlVariants(imageUrl, imageInfo.id, imageMap)
          
          successCount++
        }
      } catch (error) {
        this.logger.warn(`⚠️ 图片下载失败: ${imageUrl}`, error.message)
      }
    }

    this.logger.success(`✅ 图片处理完成: ${successCount}/${imageUrls.length} 张成功`)

    return { images, imageMap }
  }

  /**
   * 下载单张图片
   */
  private async downloadImage(url: string, articleId: string, index: number): Promise<ImageInfo | null> {
    if (!url || !this.isValidImageUrl(url)) {
      this.logger.debug(`🚫 跳过无效图片URL: ${url}`)
      return null
    }

    try {
      // 生成唯一ID
      const imageId = this.generateImageId(index)
      const format = this.getImageFormat(url)
      const filename = `${imageId}.${format}`
      
      // 确保目录存在
      const articleDir = join(this.baseDir, articleId)
      await this.ensureDir(articleDir)
      
      const localPath = join(articleDir, filename)

      this.logger.debug(`📥 开始下载图片: ${url}`)

      // 下载图片，带重试机制
      const response = await this.downloadWithRetry(url, 2)
      const buffer = Buffer.from(response)
      
      // 验证图片数据
      if (!this.isValidImageData(buffer, format)) {
        this.logger.warn(`⚠️ 无效图片数据: ${url} (${buffer.length} bytes)`)
        return null
      }

      // 检查图片大小是否合理
      if (buffer.length < 500) {
        this.logger.warn(`⚠️ 图片太小，可能是占位图: ${url} (${buffer.length} bytes)`)
        return null
      }

      // 保存图片
      await fs.writeFile(localPath, buffer)

      // 获取图片尺寸（简单实现）
      const { width, height } = this.getImageDimensions(buffer, format)

      const imageInfo: ImageInfo = {
        id: imageId,
        originalUrl: url,
        localPath,
        format,
        size: buffer.length,
        width,
        height
      }

      this.logger.info(`✅ 图片下载成功: ${filename} (${buffer.length} bytes, ${width}x${height})`)
      return imageInfo

    } catch (error: any) {
      this.logger.warn(`❌ 图片下载失败: ${url} - ${error.message}`)
      return null
    }
  }

  /**
   * 带重试机制的下载
   */
  private async downloadWithRetry(url: string, maxRetries: number): Promise<ArrayBuffer> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await ofetch(url, {
          responseType: 'arrayBuffer',
          timeout: 15000, // 减少超时时间
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': this.getRefererFromUrl(url),
            'Cache-Control': 'no-cache'
          }
        })
        return response
      } catch (error: any) {
        lastError = error
        if (attempt <= maxRetries) {
          this.logger.debug(`🔄 重试下载图片 (${attempt}/${maxRetries}): ${url}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // 递增延迟
        }
      }
    }

    throw lastError || new Error('Download failed after retries')
  }

  /**
   * 生成图片ID
   */
  private generateImageId(index: number): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${index}-${random}`
  }

  /**
   * 获取图片格式
   */
  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    
    if (extension && supportedFormats.includes(extension)) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
    
    return 'jpg' // 默认格式
  }

  /**
   * 获取Referer
   */
  private getRefererFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.hostname}/`
    } catch {
      return 'https://www.google.com/'
    }
  }

  /**
   * 验证图片URL
   */
  private isValidImageUrl(url: string): boolean {
    const invalidPatterns = [
      'data:image/svg+xml',
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP',
      'placeholder',
      'loading.gif',
      'spinner.gif',
      't.png',
      'img-placeholder',
      'logo_sspai_icon',
      'thumbnail/!72x72r',
      'thumbnail/!84x84r',
      'qrcode_service',
      'ui/img-placeholder',
      'avatar/',
      'icon.png',
      'logo.png'
    ]

    // 基本URL验证
    if (!url || url.length > 2000 || !/^https?:\/\//i.test(url)) {
      return false
    }

    // 检查无效模式
    if (invalidPatterns.some(pattern => url.includes(pattern))) {
      return false
    }

    // 检查文件扩展名
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url)
    
    // 检查是否是太小的缩略图
    const isTinyThumbnail = /thumbnail\/![0-9]{1,2}x[0-9]{1,2}r/.test(url) ||
                           /w_[0-9]{1,2}[^0-9]/.test(url) ||
                           /h_[0-9]{1,2}[^0-9]/.test(url)

    return hasValidExtension && !isTinyThumbnail
  }

  /**
   * 验证图片数据
   */
  private isValidImageData(buffer: Buffer, format: string): boolean {
    if (!buffer || buffer.length < 500) { // 提高最小大小要求
      return false
    }

    // 检查是否是HTML错误页面
    const bufferStr = buffer.toString('utf8', 0, Math.min(200, buffer.length))
    if (bufferStr.includes('<html') || bufferStr.includes('<!DOCTYPE') || bufferStr.includes('<body')) {
      return false
    }

    // 基本格式验证
    switch (format.toLowerCase()) {
      case 'png':
        return buffer[0] === 0x89 && buffer[1] === 0x50 && 
               buffer[2] === 0x4E && buffer[3] === 0x47
      case 'jpg':
      case 'jpeg':
        return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
      case 'gif':
        return buffer[0] === 0x47 && buffer[1] === 0x49 && 
               buffer[2] === 0x46 && buffer[3] === 0x38
      case 'webp':
        return buffer[0] === 0x52 && buffer[1] === 0x49 && 
               buffer[2] === 0x46 && buffer[3] === 0x46 &&
               buffer[8] === 0x57 && buffer[9] === 0x45 && 
               buffer[10] === 0x42 && buffer[11] === 0x50
      case 'svg':
        // SVG是文本格式，检查是否包含SVG标签
        return bufferStr.includes('<svg') && bufferStr.includes('</svg>')
      default:
        return buffer.length >= 500
    }
  }

  /**
   * 获取图片尺寸（简单实现）
   */
  private getImageDimensions(buffer: Buffer, format: string): { width?: number; height?: number } {
    try {
      if (format === 'png' && buffer.length > 24) {
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
      }
    } catch {
      // 忽略错误
    }
    
    return {}
  }

  /**
   * 添加URL变体到映射中
   */
  private addUrlVariants(originalUrl: string, imageId: string, imageMap: Map<string, string>): void {
    try {
      const urlObj = new URL(originalUrl)
      const baseUrl = urlObj.origin + urlObj.pathname

      // 添加基础URL（无参数）
      imageMap.set(baseUrl, imageId)

      // 添加常见参数变体
      const commonParams = [
        '?imageView2/2/w/1920/q/90/interlace/1/ignore-error/1',
        '?imageView2/2/w/1200/q/90/interlace/1/ignore-error/1',
        '?imageView2/2/w/800/q/90/interlace/1/ignore-error/1',
        '?x-oss-process=image/resize,w_1920',
        ''
      ]

      commonParams.forEach(param => {
        const variantUrl = baseUrl + param
        if (variantUrl !== originalUrl) {
          imageMap.set(variantUrl, imageId)
        }
      })

    } catch {
      // 忽略URL解析错误
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        throw error
      }
    }
  }
}

/**
 * 图片标签工具函数 - 复用现有功能
 */

/**
 * 从内容中提取图片标签
 */
export function extractImageTags(content: string): string[] {
  const imageTagRegex = /<\|([^|]+)\|>/g
  const imageIds: string[] = []
  let match

  while ((match = imageTagRegex.exec(content)) !== null) {
    imageIds.push(match[1])
  }

  return imageIds
}

/**
 * 将图片标签替换为HTML
 */
export function replaceImageTagsWithHtml(
  content: string,
  images: ImageInfo[],
  baseUrl: string = ''
): string {
  const imageMap = new Map<string, ImageInfo>()

  images.forEach(image => {
    if (image.id) {
      imageMap.set(image.id, image)
    }
  })

  return content.replace(/<\|([^|]+)\|>/g, (match, imageId) => {
    const image = imageMap.get(imageId)
    if (image) {
      const imageSrc = baseUrl + (image.localPath || image.originalUrl)
      const alt = `Image ${imageId}`
      const width = image.width ? ` width="${image.width}"` : ''
      const height = image.height ? ` height="${image.height}"` : ''

      return `<img src="${imageSrc}" alt="${alt}"${width}${height} />`
    }

    return match
  })
}

/**
 * 将图片标签替换为Markdown
 */
export function replaceImageTagsWithMarkdown(
  content: string,
  images: ImageInfo[],
  baseUrl: string = ''
): string {
  const imageMap = new Map<string, ImageInfo>()

  images.forEach(image => {
    if (image.id) {
      imageMap.set(image.id, image)
    }
  })

  return content.replace(/<\|([^|]+)\|>/g, (match, imageId) => {
    const image = imageMap.get(imageId)
    if (image) {
      const imageSrc = baseUrl + (image.localPath || image.originalUrl)
      const alt = `Image ${imageId}`

      return `![${alt}](${imageSrc})`
    }

    return match
  })
}