// 核心数据类型定义

export interface NewsSource {
  id: string
  name: string
  url: string
  enabled: boolean
  description?: string
  tags?: string[]
  interval?: number // 抓取间隔（分钟）
}

export interface ImageInfo {
  id: string
  originalUrl: string
  localPath: string
  format: string
  size: number
  width?: number
  height?: number
}

export interface ArticleContent {
  title: string
  content: string // 包含 <|image_id|> 标签的正文
  summary: string
  url: string
  publishTime: Date
  source: string
  author?: string
  hash: string
  images: ImageInfo[]
  tags: string[]
  imageMap?: Map<string, string>
}

export interface ClipperOptions {
  includeImages: boolean
  preserveFormatting: boolean
  maxImageSize?: number
  timeout?: number
  userAgent?: string
}

export interface ClipperResult {
  title: string
  content: string
  images: string[] // 图片URL列表
  metadata: {
    url: string
    publishTime?: Date
    author?: string
    description?: string
  }
}

export interface ProcessingResult {
  success: boolean
  article?: ArticleContent
  error?: string
  processingTime: number
}

export interface BatchProcessingOptions {
  maxConcurrent: number
  retryAttempts: number
  retryDelay: number
  timeout: number
}