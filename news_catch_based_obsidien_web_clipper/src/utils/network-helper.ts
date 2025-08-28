// 网络请求助手 - 带重试机制和错误处理
import { ofetch } from 'ofetch'
import { consola } from 'consola'

const logger = consola.withTag('NetworkHelper')

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
  timeout?: number
  userAgent?: string
}

export interface NetworkRequestOptions extends RetryOptions {
  headers?: Record<string, string>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
}

/**
 * 带重试机制的网络请求工具
 */
export class NetworkHelper {
  private static defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 2,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
  }

  /**
   * 执行带重试的网络请求
   */
  static async fetchWithRetry<T = any>(
    url: string, 
    options: NetworkRequestOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options }
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        logger.debug(`🌐 请求 ${url} (尝试 ${attempt + 1}/${opts.maxRetries + 1})`)

        const response = await ofetch<T>(url, {
          method: opts.method || 'GET',
          headers: {
            'User-Agent': opts.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            ...opts.headers
          },
          timeout: opts.timeout,
          body: opts.body,
          retry: 0 // 我们自己处理重试
        })

        logger.debug(`✅ 请求成功: ${url}`)
        return response

      } catch (error: any) {
        lastError = error
        const isLastAttempt = attempt === opts.maxRetries

        if (isLastAttempt) {
          logger.error(`❌ 请求最终失败: ${url}`, error.message)
          break
        }

        // 判断是否应该重试
        if (!this.shouldRetry(error)) {
          logger.warn(`⚠️ 不可重试的错误: ${url}`, error.message)
          break
        }

        const delay = opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt)
        logger.warn(`⚠️ 请求失败，${delay}ms后重试: ${url}`, error.message)
        
        await this.delay(delay)
      }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${opts.maxRetries + 1} attempts`)
  }

  /**
   * 专门用于RSS的请求
   */
  static async fetchRSS(url: string, options: RetryOptions = {}): Promise<string> {
    return this.fetchWithRetry<string>(url, {
      ...options,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    })
  }

  /**
   * 专门用于HTML页面的请求
   */
  static async fetchHTML(url: string, options: RetryOptions = {}): Promise<string> {
    return this.fetchWithRetry<string>(url, {
      ...options,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      }
    })
  }

  /**
   * 判断错误是否应该重试
   */
  private static shouldRetry(error: any): boolean {
    // 网络错误通常可以重试
    if (error.code === 'ECONNRESET' || 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'EAI_AGAIN') {
      return true
    }

    // HTTP状态码错误
    if (error.status) {
      // 5xx服务器错误可以重试
      if (error.status >= 500 && error.status < 600) {
        return true
      }
      
      // 429 Too Many Requests 可以重试
      if (error.status === 429) {
        return true
      }
      
      // 408 Request Timeout 可以重试
      if (error.status === 408) {
        return true
      }
      
      // 4xx客户端错误通常不重试（除了上面的特殊情况）
      if (error.status >= 400 && error.status < 500) {
        return false
      }
    }

    // 超时错误可以重试
    if (error.message && (
        error.message.includes('timeout') ||
        error.message.includes('TIMEOUT') ||
        error.message.includes('fetch failed') ||
        error.message.includes('network error') ||
        error.message.includes('no response')
    )) {
      return true
    }

    // 默认可以重试
    return true
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 批量请求（带并发控制）
   */
  static async fetchBatch<T = any>(
    urls: string[],
    options: NetworkRequestOptions & { concurrency?: number } = {}
  ): Promise<Array<{ url: string; result?: T; error?: Error }>> {
    const { concurrency = 3, ...requestOptions } = options
    const results: Array<{ url: string; result?: T; error?: Error }> = []
    
    // 分批处理
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (url) => {
        try {
          const result = await this.fetchWithRetry<T>(url, requestOptions)
          return { url, result }
        } catch (error) {
          return { url, error: error as Error }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 批次间延迟
      if (i + concurrency < urls.length) {
        await this.delay(1000)
      }
    }
    
    return results
  }
}