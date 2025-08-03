import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { ImageInfo } from "@shared/types"
import { generateId } from "../utils/hash.js"
import myFetch from "../utils/fetch.js"
import logger from "../utils/logger.js"

export class ImageHandler {
  private baseDir: string

  constructor(baseDir: string = './data/images') {
    this.baseDir = baseDir
  }

  async processImages(images: ImageInfo[], articleId: string): Promise<ImageInfo[]> {
    // 如果没有图片要处理，直接返回空数组，不创建文件夹
    if (!images || images.length === 0) {
      return []
    }

    const processedImages: ImageInfo[] = []
    let successCount = 0

    for (const image of images) {
      try {
        const processedImage = await this.downloadImage(image.originalUrl, articleId)
        if (processedImage) {
          processedImages.push(processedImage)
          successCount++
        }
      } catch (error) {
        logger.warn(`Failed to process image ${image.originalUrl}:`, error)
        // Keep original image info even if download fails
        processedImages.push({
          ...image,
          localPath: '',
          size: 0,
        })
      }
    }

    // 如果没有成功下载任何图片，删除创建的文件夹
    if (successCount === 0) {
      try {
        const articleDir = join(this.baseDir, articleId)
        // 只有当目录存在且为空时才删除
        const files = await fs.readdir(articleDir)
        if (files.length === 0) {
          await fs.rmdir(articleDir)
        }
      } catch (error) {
        // 忽略删除目录时的错误
      }
    }

    return processedImages
  }

  async downloadImage(url: string, articleId: string): Promise<ImageInfo | null> {
    if (!url) return null

    try {
      // Generate unique filename
      const imageId = generateId()
      const format = this.getImageFormat(url)
      const filename = `${imageId}.${format}`
      const articleDir = join(this.baseDir, articleId)
      const localPath = join(articleDir, filename)

      // Ensure directory exists
      await this.ensureDir(articleDir)

      // Download image
      const response = await myFetch(url, {
        responseType: 'arrayBuffer',
        timeout: 30000,
      })

      const buffer = Buffer.from(response)
      
      // 验证是否是有效的图片数据
      if (!this.isValidImage(buffer, format)) {
        logger.warn(`Invalid image data for ${url}`)
        return null
      }
      
      await fs.writeFile(localPath, buffer)

      // Get image dimensions (basic implementation)
      const { width, height } = await this.getImageDimensions(buffer, format)

      const imageInfo: ImageInfo = {
        id: imageId,
        originalUrl: url,
        localPath,
        format,
        size: buffer.length,
        width,
        height,
      }

      logger.success(`Image downloaded: ${filename} (${buffer.length} bytes)`)
      return imageInfo
    } catch (error) {
      logger.error(`Failed to download image ${url}:`, error.message)
      return null
    }
  }

  async getImagePath(imageId: string): Promise<string | null> {
    // This would typically query the database to get the image path
    // For now, we'll implement a simple file system search
    try {
      const files = await this.findImageFiles(imageId)
      return files.length > 0 ? files[0] : null
    } catch (error) {
      logger.error(`Failed to get image path for ${imageId}:`, error)
      return null
    }
  }

  async cleanupImages(articleId: string): Promise<void> {
    try {
      const articleDir = join(this.baseDir, articleId)
      await fs.rmdir(articleDir, { recursive: true })
      logger.success(`Cleaned up images for article: ${articleId}`)
    } catch (error) {
      logger.error(`Failed to cleanup images for article ${articleId}:`, error)
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        throw error
      }
    }
  }

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]
    
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    if (extension && supportedFormats.includes(extension)) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
    
    return 'jpg' // default format
  }

  private async getImageDimensions(buffer: Buffer, format: string): Promise<{ width?: number; height?: number }> {
    // Basic image dimension detection
    // In a production environment, you'd use a proper image processing library
    try {
      if (format === 'png' && buffer.length > 24) {
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
      } else if ((format === 'jpg' || format === 'jpeg') && buffer.length > 4) {
        // Basic JPEG dimension detection would be more complex
        // For now, return undefined to indicate unknown dimensions
        return {}
      }
    } catch (error) {
      logger.warn('Failed to get image dimensions:', error)
    }
    
    return {}
  }

  private async findImageFiles(imageId: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = join(this.baseDir, entry.name)
          const subFiles = await fs.readdir(subDir)
          
          for (const file of subFiles) {
            if (file.startsWith(imageId)) {
              files.push(join(subDir, file))
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to search for image files:', error)
    }
    
    return files
  }

  private isValidImage(buffer: Buffer, format: string): boolean {
    // Check if buffer has content
    if (!buffer || buffer.length === 0) {
      return false
    }

    // Check minimum size (at least 100 bytes for a valid image)
    if (buffer.length < 100) {
      return false
    }

    // Basic format validation
    switch (format.toLowerCase()) {
      case 'png':
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        return buffer.length > 8 && 
               buffer[0] === 0x89 && buffer[1] === 0x50 && 
               buffer[2] === 0x4E && buffer[3] === 0x47 &&
               buffer[4] === 0x0D && buffer[5] === 0x0A &&
               buffer[6] === 0x1A && buffer[7] === 0x0A
               
      case 'jpg':
      case 'jpeg':
        // JPEG signature: FF D8 FF
        return buffer.length > 3 &&
               buffer[0] === 0xFF && buffer[1] === 0xD8 &&
               buffer[2] === 0xFF
               
      case 'gif':
        // GIF signature: 47 49 46 38
        return buffer.length > 4 &&
               buffer[0] === 0x47 && buffer[1] === 0x49 &&
               buffer[2] === 0x46 && buffer[3] === 0x38
               
      default:
        // For other formats, just check size
        return buffer.length >= 100
    }
  }

}

export default ImageHandler