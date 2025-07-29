export interface NewsItem {
  id: string | number
  title: string
  url: string
  mobileUrl?: string
  pubDate?: number | string
  content?: string
  summary?: string
  author?: string
  source: string
  images?: ImageInfo[]
  tags?: string[]
  extra?: {
    hover?: string
    date?: number | string
    info?: false | string
    diff?: number
    icon?: false | string | {
      url: string
      scale: number
    }
  }
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

export interface NewsSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'html' | 'api'
  config: SourceConfig
  enabled: boolean
  interval: number
  lastCrawl?: number
  errorCount: number
}

export interface SourceConfig {
  selectors?: {
    title?: string
    content?: string
    link?: string
    image?: string
    date?: string
  }
  headers?: Record<string, string>
  proxy?: boolean
  rateLimit?: number
}

export interface ParsedArticle {
  title: string
  content: string
  summary?: string
  publishTime: Date
  author?: string
  source: string
  url: string
  images: ImageInfo[]
  tags: string[]
  hash: string
}

export interface CrawlTask {
  id: string
  sourceId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  articlesFound: number
  articlesSaved: number
  errorMessage?: string
}

export interface SearchQuery {
  keyword?: string
  source?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface SearchResult {
  items: ParsedArticle[]
  total: number
  hasMore: boolean
}

export type SourceID = string
export type Color = string

export interface SourceResponse {
  status: "success" | "cache" | "error"
  id: SourceID
  updatedTime: number | string
  items: NewsItem[]
  error?: string
}