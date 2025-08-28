// 类型定义文件

export interface ClipperOptions {
  includeImages?: boolean
  preserveFormatting?: boolean
  timeout?: number
  userAgent?: string
}

export interface ClipperResult {
  title: string
  content: string
  images: string[]
  metadata: {
    url?: string
    publishTime?: Date
    author?: string
    description?: string
    variables?: any
  }
}

export interface ArticleContent {
  title: string
  content: string
  summary: string
  url: string
  publishTime: Date
  source: string
  author?: string
  hash: string
  images: Array<{
    id: string
    originalUrl: string
    localPath: string
    format: string
    size: number
    width: number | undefined
    height: number | undefined
  }>
  tags: string[]
  imageMap?: Map<string, string>
  is_processed: boolean  // 数据清洗状态标记
}

export interface ProcessingResult {
  success: boolean
  article?: ArticleContent
  error?: string
  processingTime: number
}

export interface AINewsSource {
  id: string
  name: string
  baseUrl: string
  homepageUrl?: string
  rssUrls?: string[]
  searchUrls: string[]
  enabled: boolean
  tags: string[]
  selectors: {
    articleLinks: string
    title: string
    content: string
    publishTime: string
  }
  keywords: string[]
  interval: number
}

export interface AINewsConfig {
  sources: AINewsSource[]
  globalSettings: {
    maxArticlesPerSource: number
    contentMinLength: number
    enableKeywordFiltering: boolean
    keywordMatchThreshold: number
    excludeKeywords: string[]
    userAgent: string
    requestDelay: number
    timeout: number
  }
  autoCrawler: {
    enabled: boolean
    intervalMinutes: number
    runOnStart: boolean
  }
}