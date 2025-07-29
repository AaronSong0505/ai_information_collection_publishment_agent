// Mock NewsNow 爬虫 - 使用模拟数据避免网络问题
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import logger from '../utils/logger.js'

const MAX_ARTICLES = 10 // 开发阶段限制

// 模拟数据 - 包含完整内容
const mockData = {
  hackernews: [
    {
      title: "Show HN: I built a tool to visualize Git repositories",
      url: "https://news.ycombinator.com/item?id=12345",
      content: "I've been working on a tool that creates interactive visualizations of Git repositories. It shows commit history, branch relationships, and contributor activity in a beautiful graph format. The tool is built with D3.js and can handle repositories of any size. It's particularly useful for understanding complex branching strategies and identifying bottlenecks in development workflows. The visualization updates in real-time as you navigate through different time periods.",
      extra: { info: "234 points" }
    },
    {
      title: "Ask HN: What's your favorite programming language and why?",
      url: "https://news.ycombinator.com/item?id=12346",
      content: "I'm curious about the community's preferences when it comes to programming languages. What's your go-to language and what makes it special for you? Is it the syntax, the ecosystem, performance, or something else? I've been using Python for data science work but I'm considering learning Rust for systems programming. Would love to hear about your experiences with different languages and any recommendations for someone looking to expand their toolkit.",
      extra: { info: "156 points" }
    },
    {
      title: "New JavaScript framework promises 10x performance",
      url: "https://news.ycombinator.com/item?id=12347",
      content: "A new JavaScript framework called 'VelocityJS' claims to deliver 10x better performance compared to React and Vue. The framework uses a novel virtual DOM implementation with compile-time optimizations and aggressive tree-shaking. Early benchmarks show impressive results, especially for large applications with complex state management. The framework is still in beta but the team behind it includes former engineers from Google and Facebook. They're planning a stable release by the end of the year.",
      extra: { info: "89 points" }
    }
  ],
  github: [
    {
      title: "microsoft/TypeScript",
      url: "https://github.com/microsoft/TypeScript",
      content: "TypeScript is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications for any browser, for any host, on any OS. TypeScript compiles to readable, standards-based JavaScript. The latest version includes improved performance, better error messages, and enhanced support for modern JavaScript features. The project has over 98,000 stars and is actively maintained by Microsoft with contributions from the open source community.",
      extra: { 
        info: "✰ 98.2k",
        hover: "TypeScript is a superset of JavaScript that compiles to clean JavaScript output."
      }
    },
    {
      title: "facebook/react", 
      url: "https://github.com/facebook/react",
      content: "React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called components. React has been designed from the start for gradual adoption, and you can use as little or as much React as you need. Whether you're working on a simple website or a complex web application, React provides the tools and patterns you need to build maintainable and scalable user interfaces. The library is maintained by Meta and the community.",
      extra: {
        info: "✰ 220k",
        hover: "The library for web and native user interfaces"
      }
    },
    {
      title: "vercel/next.js",
      url: "https://github.com/vercel/next.js", 
      content: "Next.js is a React framework that gives you building blocks to create web applications. By framework, we mean Next.js handles the tooling and configuration needed for React, and provides additional structure, features, and optimizations for your application. You can use React to build your UI, then incrementally adopt Next.js features to solve common application requirements such as routing, data fetching, integrations - all while improving the developer and end-user experience.",
      extra: {
        info: "✰ 120k",
        hover: "The React Framework for the Web"
      }
    }
  ],
  v2ex: [
    {
      title: "请问大家都用什么工具来管理密码？",
      url: "https://www.v2ex.com/t/123456",
      content: "最近越来越觉得密码管理是个大问题，各种网站的密码都不一样，记不住又不安全。想问问大家都用什么工具来管理密码？我现在在考虑 1Password、Bitwarden 和 LastPass 这几个，不知道哪个比较好用。主要需求是跨平台同步，安全性要高，最好还能生成强密码。有用过的朋友可以分享一下使用体验吗？特别是在移动端的使用感受如何？",
      extra: { info: "45 回复" }
    },
    {
      title: "分享一个我写的开源项目",
      url: "https://www.v2ex.com/t/123457", 
      content: "花了几个月时间写了一个轻量级的博客系统，主要特点是支持 Markdown 编写，自动生成静态页面，SEO 友好。技术栈用的是 Node.js + Express + SQLite，前端用了 Vue.js。支持主题切换、评论系统、标签分类等功能。代码已经开源到 GitHub，欢迎大家试用和提建议。这是我第一次做开源项目，希望能对社区有所贡献。项目地址在我的个人资料里，有问题可以直接提 issue。",
      extra: { info: "23 回复" }
    },
    {
      title: "关于远程工作的一些思考",
      url: "https://www.v2ex.com/t/123458",
      content: "疫情之后远程工作变得越来越普遍，我也体验了两年多的远程工作。总体来说有利有弊。好处是节省通勤时间，工作环境更舒适，时间安排更灵活。但也有一些挑战，比如沟通成本增加，容易缺乏团队归属感，工作和生活边界模糊。对于公司来说，远程工作可以招聘到更广泛的人才，降低办公成本，但管理难度也会增加。想听听大家对远程工作的看法，你们觉得未来会是什么趋势？",
      extra: { info: "67 回复" }
    }
  ],
  ithome: [
    {
      title: "微软发布 Windows 11 最新更新",
      url: "https://www.ithome.com/0/123456.htm",
      content: "微软今天向 Windows 11 用户推送了最新的累积更新，版本号为 KB5034123。此次更新主要修复了多个安全漏洞和系统稳定性问题。更新内容包括：修复了文件资源管理器偶尔崩溃的问题，改进了多显示器支持，优化了电池续航表现，增强了 Windows Defender 的检测能力。微软建议所有用户尽快安装此更新。更新大小约为 500MB，需要重启系统才能完成安装。用户可以通过 Windows Update 或微软更新目录手动下载安装。",
      pubDate: new Date().toISOString()
    },
    {
      title: "苹果 iPhone 15 Pro 评测：性能提升显著", 
      url: "https://www.ithome.com/0/123457.htm",
      content: "苹果 iPhone 15 Pro 搭载了全新的 A17 Pro 芯片，采用 3nm 工艺制程，性能相比上一代提升约 20%。新机配备了钛合金边框，重量减轻了 19 克，手感更加轻盈。摄像头系统也有显著升级，主摄像头支持 5 倍光学变焦，夜景拍摄能力大幅提升。屏幕支持 120Hz ProMotion 技术，显示效果更加流畅。电池续航方面，日常使用可以坚持一整天。新增的 Action Button 取代了传统的静音开关，可以自定义多种功能。总体来说，iPhone 15 Pro 是一次全面的升级。",
      pubDate: new Date().toISOString()
    }
  ]
}

export class MockNewsNowCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void

  async startCrawling(): Promise<void> {
    logger.info('🚀 启动 Mock NewsNow 爬虫 (使用模拟数据)...')
    logger.info(`📊 限制: 最多抓取 ${MAX_ARTICLES} 篇完整文章`)
    
    try {
      // 检查现有文章数量
      const existingArticles = await this.db.searchArticles({ limit: 100, offset: 0 })
      this.articleCount = existingArticles.total
      
      if (this.articleCount >= MAX_ARTICLES) {
        logger.warn(`⚠️ 已达到文章数量限制 (${this.articleCount}/${MAX_ARTICLES})，停止抓取`)
        return
      }
      
      logger.info(`📊 当前已有 ${this.articleCount} 篇文章，还可抓取 ${MAX_ARTICLES - this.articleCount} 篇`)

      // 模拟抓取各个源
      await this.mockCrawlHackerNews()
      await this.sleep(1000)
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.mockCrawlGitHub()
        await this.sleep(1000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.mockCrawlV2EX()
        await this.sleep(1000)
      }
      
      if (!this.shouldStop && this.articleCount < MAX_ARTICLES) {
        await this.mockCrawlITHome()
        await this.sleep(1000)
      }
      
      logger.success(`🎉 抓取完成！总共处理了 ${this.articleCount} 篇文章`)
      
      // 如果达到限制，触发完成回调
      if (this.articleCount >= MAX_ARTICLES && this.onComplete) {
        logger.info('🛑 达到文章数量限制，准备停止服务...')
        setTimeout(() => {
          this.onComplete?.()
        }, 2000)
      }
      
    } catch (error) {
      logger.error('❌ 抓取过程出错:', error)
    }
  }

  private async mockCrawlHackerNews(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 模拟抓取 Hacker News...')
    
    try {
      // 模拟网络延迟
      await this.sleep(500)
      
      const items = mockData.hackernews.map(item => ({
        ...item,
        source: 'hackernews'
      }))
      
      await this.processItems(items, 'hackernews')
      
    } catch (error) {
      logger.error('❌ Hacker News 模拟抓取失败:', error)
    }
  }

  private async mockCrawlGitHub(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 模拟抓取 GitHub Trending...')
    
    try {
      await this.sleep(500)
      
      const items = mockData.github.map(item => ({
        ...item,
        source: 'github'
      }))
      
      await this.processItems(items, 'github')
      
    } catch (error) {
      logger.error('❌ GitHub Trending 模拟抓取失败:', error)
    }
  }

  private async mockCrawlV2EX(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 模拟抓取 V2EX...')
    
    try {
      await this.sleep(500)
      
      const items = mockData.v2ex.map(item => ({
        ...item,
        source: 'v2ex'
      }))
      
      await this.processItems(items, 'v2ex')
      
    } catch (error) {
      logger.error('❌ V2EX 模拟抓取失败:', error)
    }
  }

  private async mockCrawlITHome(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 模拟抓取 IT Home...')
    
    try {
      await this.sleep(500)
      
      const items = mockData.ithome.map(item => ({
        ...item,
        source: 'ithome'
      }))
      
      await this.processItems(items, 'ithome')
      
    } catch (error) {
      logger.error('❌ IT Home 模拟抓取失败:', error)
    }
  }

  private async processItems(items: any[], sourceName: string): Promise<void> {
    logger.info(`📋 ${sourceName} 获得 ${items.length} 条新闻`)
    
    for (const item of items.slice(0, 3)) { // 每个源最多处理3条
      if (this.shouldStop || this.articleCount >= MAX_ARTICLES) {
        logger.info(`🛑 达到文章数量限制 (${MAX_ARTICLES})，停止抓取`)
        break
      }
      
      try {
        // 检查是否已存在
        const existing = await this.db.searchArticles({ 
          keyword: item.url,
          limit: 1,
          offset: 0 
        })
        
        if (existing.items.length > 0) {
          logger.info(`⏭️ 文章已存在，跳过: ${item.title?.substring(0, 30)}...`)
          continue
        }
        
        // 转换为我们的格式
        const article = this.convertItem(item, sourceName)
        
        if (article) {
          // 保存到数据库
          await this.db.saveArticle(article)
          this.articleCount++
          
          logger.success(`💾 文章已保存 (${this.articleCount}/${MAX_ARTICLES}): ${article.title.substring(0, 40)}...`)
          
          // 检查是否达到限制
          if (this.articleCount >= MAX_ARTICLES) {
            logger.info('🎯 已达到文章数量限制，准备停止服务...')
            if (this.onComplete) {
              setTimeout(() => {
                this.onComplete?.()
              }, 2000)
            }
            return
          }
          
          // 每篇文章之间暂停
          await this.sleep(500)
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
    }
  }

  private convertItem(item: any, sourceName: string): any {
    const title = item.title || '无标题'
    const url = item.url || ''
    // 优先使用 content 字段，然后是 hover 描述，最后才是标题
    const content = item.content || item.extra?.hover || item.description || title
    const publishTime = item.pubDate ? new Date(item.pubDate) : new Date()
    
    // 生成内容哈希用于去重
    const hash = generateContentHash(title, content, url)
    
    return {
      title: title.trim(),
      content: content.trim(),
      summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
      url,
      publishTime,
      source: sourceName,
      hash,
      images: [],
      tags: []
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  stop(): void {
    logger.info('🛑 收到停止信号')
    this.shouldStop = true
  }

  getStatus(): { articleCount: number, maxArticles: number, shouldStop: boolean } {
    return {
      articleCount: this.articleCount,
      maxArticles: MAX_ARTICLES,
      shouldStop: this.shouldStop
    }
  }

  setOnComplete(callback: () => void): void {
    this.onComplete = callback
  }
}

// 单例实例
let crawlerInstance: MockNewsNowCrawler | null = null

export function getMockNewsNowCrawler(): MockNewsNowCrawler {
  if (!crawlerInstance) {
    crawlerInstance = new MockNewsNowCrawler()
  }
  return crawlerInstance
}