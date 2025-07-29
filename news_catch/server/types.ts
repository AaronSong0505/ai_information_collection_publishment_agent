import type { NewsItem, SourceID, ParsedArticle } from "@shared/types"

export interface RSSInfo {
  title: string
  description: string
  link: string
  image: string
  updatedTime: string
  items: RSSItem[]
}

export interface RSSItem {
  title: string
  description: string
  link: string
  created?: string
}

export interface CacheInfo {
  id: SourceID
  items: NewsItem[]
  updated: number
}

export interface CacheRow {
  id: SourceID
  data: string
  updated: number
}

export interface ArticleRow {
  id: string
  title: string
  content: string
  summary?: string
  publish_time: string
  crawl_time: string
  author?: string
  source_id: string
  source_url: string
  hash: string
  status: string
  tags?: string
  metadata?: string
}

export interface ImageRow {
  id: string
  article_id: string
  original_url: string
  local_path: string
  format: string
  size: number
  width?: number
  height?: number
  created_at: string
}

export interface CrawlLogRow {
  id: string
  source_id: string
  start_time: string
  end_time?: string
  status: string
  articles_found: number
  articles_saved: number
  error_message?: string
}

export interface SourceOption {
  hiddenDate?: boolean
}

export type SourceGetter = () => Promise<NewsItem[]>

export interface ParserPlugin {
  parse(content: string, source: NewsSource): Promise<ParsedArticle>
}

export interface CrawlerConfig {
  maxConcurrent: number
  retryAttempts: number
  retryDelay: number
  timeout: number
  userAgent: string
}