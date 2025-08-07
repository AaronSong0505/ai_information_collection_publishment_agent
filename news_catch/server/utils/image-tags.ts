// 图片标签处理工具函数
import type { ImageInfo } from "@shared/types"

/**
 * 从文章内容中提取所有图片标签
 * @param content 文章内容
 * @returns 图片ID数组
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
 * 将文章内容中的图片标签替换为实际的图片HTML
 * @param content 包含图片标签的内容
 * @param images 图片信息数组
 * @param baseUrl 图片基础URL（可选）
 * @returns 替换后的HTML内容
 */
export function replaceImageTagsWithHtml(
  content: string, 
  images: ImageInfo[], 
  baseUrl: string = ''
): string {
  const imageMap = new Map<string, ImageInfo>()
  
  // 建立ID到图片信息的映射
  images.forEach(image => {
    if (image.id) {
      imageMap.set(image.id, image)
    }
  })
  
  // 替换图片标签
  return content.replace(/<\|([^|]+)\|>/g, (match, imageId) => {
    const image = imageMap.get(imageId)
    if (image) {
      const imageSrc = baseUrl + (image.localPath || image.originalUrl)
      const alt = `Image ${imageId}`
      const width = image.width ? ` width="${image.width}"` : ''
      const height = image.height ? ` height="${image.height}"` : ''
      
      return `<img src="${imageSrc}" alt="${alt}"${width}${height} />`
    }
    
    // 如果找不到对应的图片，保留原标签
    return match
  })
}

/**
 * 将文章内容中的图片标签替换为Markdown格式
 * @param content 包含图片标签的内容
 * @param images 图片信息数组
 * @param baseUrl 图片基础URL（可选）
 * @returns 替换后的Markdown内容
 */
export function replaceImageTagsWithMarkdown(
  content: string, 
  images: ImageInfo[], 
  baseUrl: string = ''
): string {
  const imageMap = new Map<string, ImageInfo>()
  
  // 建立ID到图片信息的映射
  images.forEach(image => {
    if (image.id) {
      imageMap.set(image.id, image)
    }
  })
  
  // 替换图片标签
  return content.replace(/<\|([^|]+)\|>/g, (match, imageId) => {
    const image = imageMap.get(imageId)
    if (image) {
      const imageSrc = baseUrl + (image.localPath || image.originalUrl)
      const alt = `Image ${imageId}`
      
      return `![${alt}](${imageSrc})`
    }
    
    // 如果找不到对应的图片，保留原标签
    return match
  })
}

/**
 * 验证文章内容中的图片标签是否都有对应的图片
 * @param content 文章内容
 * @param images 图片信息数组
 * @returns 验证结果
 */
export function validateImageTags(content: string, images: ImageInfo[]): {
  valid: boolean
  totalTags: number
  validTags: number
  invalidTags: string[]
  missingImages: string[]
} {
  const imageIds = extractImageTags(content)
  const availableImageIds = new Set(images.map(img => img.id).filter(Boolean))
  
  const invalidTags: string[] = []
  const missingImages: string[] = []
  
  imageIds.forEach(imageId => {
    if (!availableImageIds.has(imageId)) {
      invalidTags.push(imageId)
    }
  })
  
  // 检查是否有图片没有在内容中使用
  images.forEach(image => {
    if (image.id && !imageIds.includes(image.id)) {
      missingImages.push(image.id)
    }
  })
  
  return {
    valid: invalidTags.length === 0,
    totalTags: imageIds.length,
    validTags: imageIds.length - invalidTags.length,
    invalidTags,
    missingImages
  }
}

/**
 * 获取文章内容的统计信息
 * @param content 文章内容
 * @returns 统计信息
 */
export function getContentStats(content: string): {
  totalLength: number
  textLength: number
  imageTagCount: number
  imageIds: string[]
} {
  const imageIds = extractImageTags(content)
  const textContent = content.replace(/<\|[^|]+\|>/g, '')
  
  return {
    totalLength: content.length,
    textLength: textContent.length,
    imageTagCount: imageIds.length,
    imageIds
  }
}

/**
 * 重新排列图片标签，确保它们按照在内容中出现的顺序排列
 * @param content 文章内容
 * @param images 图片信息数组
 * @returns 重新排列后的图片数组
 */
export function reorderImagesByContent(content: string, images: ImageInfo[]): ImageInfo[] {
  const imageIds = extractImageTags(content)
  const imageMap = new Map<string, ImageInfo>()
  
  // 建立ID到图片的映射
  images.forEach(image => {
    if (image.id) {
      imageMap.set(image.id, image)
    }
  })
  
  // 按照在内容中出现的顺序重新排列
  const reorderedImages: ImageInfo[] = []
  const usedIds = new Set<string>()
  
  imageIds.forEach(imageId => {
    if (!usedIds.has(imageId)) {
      const image = imageMap.get(imageId)
      if (image) {
        reorderedImages.push(image)
        usedIds.add(imageId)
      }
    }
  })
  
  // 添加未在内容中使用的图片
  images.forEach(image => {
    if (image.id && !usedIds.has(image.id)) {
      reorderedImages.push(image)
    }
  })
  
  return reorderedImages
}