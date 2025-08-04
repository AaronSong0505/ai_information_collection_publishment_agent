// AI 技术新闻爬虫 - 使用真实的新闻源获取最新 AI 技术资讯
import * as cheerio from 'cheerio'
import { getSimpleDatabase } from '../database/simple.js'
import { generateContentHash } from '../utils/hash.js'
import myFetch from '../utils/fetch.js'
import logger from '../utils/logger.js'
import { fetchArticleContent, ContentImage } from './content-fetcher.ts'
import ImageHandler from './images.js'
import type { ImageInfo } from '../../shared/types.js'

const MAX_ARTICLES = 20 // 增加到20篇文章

interface AINewsCrawlerOptions {
  onComplete?: () => void
}

export class AITechNewsCrawler {
  private db = getSimpleDatabase()
  private articleCount = 0
  private shouldStop = false
  private onComplete?: () => void
  private imageHandler = new ImageHandler('./data/images')

  async startCrawling(): Promise<void> {
    logger.info('🤖 启动 AI 技术新闻爬虫...')
    logger.info(`📊 限制: 最多抓取 ${MAX_ARTICLES} 篇完整文章`)
    logger.info('🎯 专注: AI 技术、科技新闻、创业资讯')
    logger.info(`📊 当前已有 ${this.articleCount} 篇文章，还可抓取 ${MAX_ARTICLES - this.articleCount} 篇`)
    
    try {
      // 国内主要AI新闻源
      await this.crawl36Kr()           // 36氪 - 创业和科技资讯
      await sleep(2000) // 延迟2秒避免请求过于频繁
      await this.crawlITHome()         // IT之家 - 科技新闻
      await sleep(2000)
      await this.crawlJuejin()         // 掘金 - 技术文章
      await sleep(2000)
      await this.crawlSolidot()        // Solidot - 开源技术新闻
      await sleep(2000)
      await this.crawlSSPai()          // 少数派 - 科技生活资讯
      await sleep(2000)
      
      // 国内专业AI媒体
      await this.crawlJiqizhixin()     // 机器之心 - AI技术和产业媒体
      await sleep(2000)
      await this.crawlLeiphone()       // 雷锋网 - AI科技媒体
      await sleep(2000)
      
      // 国际AI新闻源
      await this.crawlTechCrunchAI()   // TechCrunch AI - 国际科技媒体AI频道
      await sleep(2000)
      await this.crawlMITTechReview()  // MIT Technology Review - 顶级科技评论媒体
      
      logger.info(`🎉 爬虫完成，总共抓取 ${this.articleCount} 篇文章`)
    } catch (error) {
      logger.error('❌ 爬虫过程中出现错误:', error)
    } finally {
      this.isRunning = false
      if (this.onComplete) {
        this.onComplete()
      }
    }
  }

  // 36氪 - 创业和科技资讯
  private async crawl36Kr(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 36氪 科技资讯...')
    
    try {
      const baseURL = "https://www.36kr.com"
      const url = `${baseURL}/newsflashes`
      const response = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $(".newsflash-item")
      $items.each((_, el) => {
        const $el = $(el)
        const $a = $el.find("a.item-title")
        const itemUrl = $a.attr("href")
        const title = $a.text().trim()
        const relativeDate = $el.find(".time").text()
        const description = $el.find(".brief").text().trim() // 获取描述信息
        
        if (itemUrl && title && relativeDate) {
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: `${baseURL}${itemUrl}`,
              title,
              id: itemUrl,
              source: '36kr',
              pubDate: new Date().toISOString(), // 使用当前时间作为发布时间
              content: description || `${title} - 来自36氪的最新科技资讯报道。` // 使用描述信息
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), '36kr')
      
    } catch (error) {
      logger.error('❌ 36氪抓取失败:', error.message)
    }
  }

  // IT之家 - 科技新闻
  private async crawlITHome(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 IT之家 科技新闻...')
    
    try {
      const response = await myFetch("https://www.ithome.com/list/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $main = $("#list > div.fl > ul > li")
      $main.each((_, el) => {
        const $el = $(el)
        const $a = $el.find("a.t")
        const url = $a.attr("href")
        const title = $a.text().trim()
        const date = $(el).find("i").text()
        
        if (url && title && date) {
          // 过滤广告和 AI 相关内容
          const isAd = url?.includes("lapin") || ["神券", "优惠", "补贴", "京东"].find(k => title.includes(k))
          if (!isAd && this.isAIRelated(title)) {
            items.push({
              url,
              title,
              id: url,
              source: 'ithome',
              pubDate: new Date().toISOString(),
              content: `${title} - IT之家报道，${date}发布的最新科技新闻。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), 'ithome')
      
    } catch (error) {
      logger.error('❌ IT之家抓取失败:', error.message)
    }
  }

  // 掘金 - 技术文章
  private async crawlJuejin(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 掘金 技术文章...')
    
    try {
      const url = `https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0`
      const res = await myFetch(url, { timeout: 15000 })
      const items: any[] = []
      
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((k: any) => {
          const title = k.content?.title
          const contentId = k.content?.content_id
          
          if (title && contentId && this.isAIRelated(title)) {
            items.push({
              id: contentId,
              title,
              url: `https://juejin.cn/post/${contentId}`,
              source: 'juejin',
              pubDate: new Date().toISOString(),
              content: `${title} - 掘金热门技术文章，专注于前沿技术分享。`
            })
          }
        })
      }
      
      await this.processItems(items.slice(0, 2), 'juejin')
      
    } catch (error) {
      logger.error('❌ 掘金抓取失败:', error.message)
    }
  }

  // Solidot - 开源技术新闻
  private async crawlSolidot(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 Solidot 开源技术新闻...')
    
    try {
      const baseURL = "https://www.solidot.org"
      const html = await myFetch(baseURL, { timeout: 15000 })
      const $ = cheerio.load(html)
      const items: any[] = []
      
      const $main = $(".block_m")
      $main.each((_, el) => {
        const a = $(el).find(".bg_htit a").last()
        const url = a.attr("href")
        const title = a.text().trim()
        const dateRaw = $(el).find(".talk_time").text().match(/发表于(.*?分)/)?.[1]
        
        if (url && title && this.isAIRelated(title)) {
          items.push({
            url: baseURL + url,
            title,
            id: url,
            source: 'solidot',
            pubDate: new Date().toISOString(),
            content: `${title} - Solidot 开源技术新闻报道，关注最新的技术发展动态。`
          })
        }
      })
      
      await this.processItems(items.slice(0, 2), 'solidot')
      
    } catch (error) {
      logger.error('❌ Solidot抓取失败:', error.message)
    }
  }

  // 少数派 - 科技生活
  private async crawlSSPai(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 少数派 科技文章...')
    
    try {
      const timestamp = Date.now()
      const limit = 30
      const url = `https://sspai.com/api/v1/article/tag/page/get?limit=${limit}&offset=0&created_at=${timestamp}&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false`
      const res = await myFetch(url, { timeout: 15000 })
      const items: any[] = []
      
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((k: any) => {
          const title = k.title
          const id = k.id
          
          if (title && id && this.isAIRelated(title)) {
            items.push({
              id,
              title,
              url: `https://sspai.com/post/${id}`,
              source: 'sspai',
              pubDate: new Date().toISOString(),
              content: `${title} - 少数派科技文章，专注于数字生活和效率工具。`
            })
          }
        })
      }
      
      await this.processItems(items.slice(0, 2), 'sspai')
      
    } catch (error) {
      logger.error('❌ 少数派抓取失败:', error.message)
    }
  }

  // 机器之心 - AI技术和产业媒体
  private async crawlJiqizhixin(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 机器之心 AI 技术资讯...')
    
    try {
      const response = await myFetch("https://www.jiqizhixin.com/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $("article.article-item, .content-item, .article-content-item")
      $items.each((_, el) => {
        const $el = $(el)
        const $a = $el.find("h3 a, .article-title a, .content-item-title a").first()
        const title = $a.text().trim()
        const url = $a.attr("href")
        
        if (url && title) {
          // 处理相对链接
          const fullUrl = url.startsWith('http') ? url : `https://www.jiqizhixin.com${url}`
          
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: fullUrl,
              title,
              id: fullUrl,
              source: '机器之心',
              pubDate: new Date().toISOString(),
              content: `${title} - 来自机器之心的最新AI技术资讯报道。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), '机器之心')
      
    } catch (error) {
      logger.error('❌ 机器之心抓取失败:', error.message)
    }
  }

  // 雷锋网 - AI科技媒体
  private async crawlLeiphone(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 雷锋网 AI 科技资讯...')
    
    try {
      const response = await myFetch("https://www.leiphone.com/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $(".word > h3 > a, .list-text-cont > h3 > a, .article-item h3 a")
      $items.each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const url = $el.attr("href")
        
        if (url && title) {
          // 处理相对链接
          const fullUrl = url.startsWith('http') ? url : `https://www.leiphone.com${url}`
          
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: fullUrl,
              title,
              id: fullUrl,
              source: '雷锋网',
              pubDate: new Date().toISOString(),
              content: `${title} - 来自雷锋网的最新AI科技资讯报道。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), '雷锋网')
      
    } catch (error) {
      logger.error('❌ 雷锋网抓取失败:', error.message)
    }
  }

  // TechCrunch AI - 国际科技媒体AI频道
  private async crawlTechCrunchAI(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 TechCrunch AI 国际资讯...')
    
    try {
      const response = await myFetch("https://techcrunch.com/category/artificial-intelligence/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $("h2.post-block__title a, .post-block h3 a")
      $items.each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const url = $el.attr("href")
        
        if (url && title) {
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url,
              title,
              id: url,
              source: 'TechCrunch',
              pubDate: new Date().toISOString(),
              content: `${title} - 来自TechCrunch的最新国际AI技术资讯报道。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), 'TechCrunch')
      
    } catch (error) {
      logger.error('❌ TechCrunch AI 抓取失败:', error.message)
    }
  }

  // MIT Technology Review - 顶级科技评论媒体
  private async crawlMITTechReview(): Promise<void> {
    if (this.articleCount >= MAX_ARTICLES) return
    
    logger.info('📡 抓取 MIT Technology Review 科技资讯...')
    
    try {
      const response = await myFetch("https://www.technologyreview.com/topic/artificial-intelligence/", { timeout: 15000 })
      const $ = cheerio.load(response)
      const items: any[] = []
      
      const $items = $("h3 a, .storyTitle a, .story-title a")
      $items.each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const url = $el.attr("href")
        
        if (url && title) {
          // 处理相对链接
          const fullUrl = url.startsWith('http') ? url : `https://www.technologyreview.com${url}`
          
          // 过滤 AI 相关内容
          if (this.isAIRelated(title)) {
            items.push({
              url: fullUrl,
              title,
              id: fullUrl,
              source: 'MIT Tech Review',
              pubDate: new Date().toISOString(),
              content: `${title} - 来自MIT Technology Review的顶级科技评论报道。`
            })
          }
        }
      })
      
      await this.processItems(items.slice(0, 3), 'MIT Tech Review')
      
    } catch (error) {
      logger.error('❌ MIT Technology Review 抓取失败:', error.message)
    }
  }

  // 判断是否为 AI 相关内容
  private isAIRelated(text: string): boolean {
    const aiKeywords = [
      // 核心AI术语
      'AI', 'ai', '人工智能', '机器学习', '深度学习', '神经网络', '算法',
      'ChatGPT', 'GPT', 'OpenAI', '大模型', 'LLM', '语言模型', '生成式',
      'Transformer', 'BERT', 'NLP', '自然语言处理', '计算机视觉', 'CV',
      'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn',
      
      // AI技术和方法
      '强化学习', '迁移学习', '监督学习', '无监督学习', '自监督学习',
      '联邦学习', '边缘计算', '云计算', '模型训练', '模型推理',
      '模型优化', '模型压缩', '模型蒸馏', '参数优化',
      
      // 国内外知名AI公司和产品
      'Claude', 'Gemini', 'Llama', '文心一言', '通义千问', '智谱清言',
      '百川智能', '讯飞星火', '商汤科技', '旷视科技', '云从科技',
      '出门问问', '第四范式', '依图科技', 'NVIDIA', 'AMD', 'Intel',
      'Google AI', 'Microsoft AI', 'Amazon AI', 'Meta AI', 'Apple AI',
      
      // AI应用领域 - 医疗健康
      '医疗AI', '医学影像', '药物研发', '基因测序', '智能诊断', '远程医疗',
      '健康管理', '辅助诊疗', '病理分析', '影像识别', '疾病预测',
      
      // AI应用领域 - 金融科技
      '金融AI', '智能投顾', '风险控制', '欺诈检测', '量化交易', '区块链金融',
      '信用评估', '保险科技', '支付科技', '数字货币', '算法交易',
      
      // AI应用领域 - 教育培训
      '教育AI', '智能教学', '个性化学习', '在线教育', '虚拟导师', '智能辅导',
      '学习分析', '教育机器人', '自适应学习', '智能评测',
      
      // AI应用领域 - 智能制造
      '工业AI', '智能制造', '工业4.0', '预测性维护', '质量控制', '供应链优化',
      '机器人自动化', '智能仓储', '数字孪生', '工业机器人',
      
      // AI应用领域 - 智慧城市
      '智慧城市', '智能交通', '环境监测', '城市大脑', '公共安全', '智能安防',
      '智能照明', '智慧能源', '城市规划', '应急管理',
      
      // AI应用领域 - 零售电商
      '零售AI', '智能推荐', '个性化营销', '智能客服', '无人零售', '库存管理',
      '价格优化', '需求预测', '购物体验', '虚拟试衣',
      
      // AI应用领域 - 交通出行
      '交通AI', '自动驾驶', '智能交通', '路径规划', '车联网', '智慧停车',
      '共享出行', '物流优化', '智能导航', '交通预测',
      
      // AI应用领域 - 农业科技
      '农业AI', '精准农业', '智能灌溉', '作物监测', '农业机器人', '病虫害识别',
      '产量预测', '土壤分析', '智能农机', '智慧农场',
      
      // AI应用领域 - 能源环保
      '能源AI', '智能电网', '能源管理', '可再生能源', '碳中和', '环境监测',
      '气候预测', '节能减排', '智能建筑', '绿色能源',
      
      // AI应用领域 - 媒体娱乐
      '媒体AI', '内容生成', '智能剪辑', '虚拟主播', '游戏AI', '音乐生成',
      '视频分析', '内容推荐', '数字人', '虚拟现实',
      
      // AI应用领域 - 法律服务
      '法律AI', '智能法务', '合同审查', '案件预测', '法律咨询', '合规管理',
      '文书生成', '类案推送', '量刑辅助', '司法大数据',
      
      // AI应用领域 - 人力资源
      'HR AI', '智能招聘', '人才评估', '员工关怀', '绩效管理', '组织诊断',
      '员工培训', '离职预测', '薪酬优化', '团队协作',
      
      // AI应用领域 - 公共安全
      '安防AI', '人脸识别', '行为分析', '智能监控', '威胁识别', '反恐预警',
      '网络安全', '数据安全', '入侵检测', '风险评估',
      
      // AI应用领域 - 物流运输
      '物流AI', '路径优化', '仓储管理', '包裹追踪', '智能分拣', '运输调度',
      '车队管理', '配送优化', '库存优化', '供应链可视化',
      
      // AI应用领域 - 房地产
      '房地产AI', '智能估价', '空间规划', '建筑设计', '物业管理', '智能家居',
      '房产推荐', '租赁管理', '设施管理', '能耗优化',
      
      // AI应用领域 - 旅游服务
      '旅游AI', '智能推荐', '行程规划', '景点识别', '语音导览', '智能翻译',
      '酒店管理', '客户服务', '风险预警', '个性化体验',
      
      // AI应用领域 - 游戏娱乐
      '游戏AI', 'NPC行为', '关卡生成', '平衡调整', '玩家匹配', '作弊检测',
      '沉浸体验', '虚拟世界', '互动叙事', '智能对手',
      
      // AI应用领域 - 通信技术
      '通信AI', '网络优化', '信号处理', '频谱管理', '故障诊断', '容量规划',
      '智能运维', '用户体验', '网络安全', '5G优化',
      
      // AI应用领域 - 科学研究
      '科研AI', '数据分析', '模式识别', '科学计算', '实验设计', '文献挖掘',
      '假说验证', '知识图谱', '智能发现', '仿真建模'
    ]
    
    return aiKeywords.some(keyword => text.includes(keyword))
  }

  private async processItems(items: any[], sourceName: string): Promise<void> {
    logger.info(`📋 ${sourceName} 获得 ${items.length} 条 AI 相关新闻`)
    
    for (const item of items) {
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
        
        // 抓取完整内容和图片
        const fullArticle = await this.fetchFullContent(item, sourceName)
        
        if (fullArticle) {
          // 保存到数据库
          await this.db.saveArticle(fullArticle)
          this.articleCount++
          
          logger.success(`💾 AI新闻已保存 (${this.articleCount}/${MAX_ARTICLES}): ${fullArticle.title.substring(0, 40)}... [${fullArticle.content.length}字符, ${fullArticle.images.length}图片]`)
          
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
          await this.sleep(2000) // 增加延迟，给内容抓取更多时间
        }
        
      } catch (error) {
        logger.warn(`⚠️ 处理文章失败: ${item.title}`, error.message)
      }
    }
  }

  // 抓取完整文章内容和图片
  private async fetchFullContent(item: any, sourceName: string): Promise<any | null> {
    try {
      logger.info(`🔍 抓取完整内容: ${item.title.substring(0, 50)}...`)
      
      // 抓取完整文章内容（包括图像占位符）
      const fullContent = await fetchArticleContent(
        item.url, 
        item.title, 
        item.content || '', 
        sourceName
      )
      
      if (!fullContent) {
        logger.warn(`⚠️ 无法获取完整内容，使用基本信息: ${item.title}`)
        return this.convertItem(item, sourceName)
      }
      
      // 抓取页面中的图片
      const images = await this.extractImages(item.url, fullContent.title)
      
      // 转换为最终格式
      const article = {
        title: fullContent.title,
        content: fullContent.content,
        summary: fullContent.summary,
        url: fullContent.url,
        publishTime: fullContent.publishTime,
        source: sourceName,
        hash: fullContent.hash,
        images: images,
        tags: ['AI', '科技', '技术']
      }
      
      return article
      
    } catch (error) {
      logger.warn(`⚠️ 完整内容抓取失败: ${item.title}`, error.message)
      return this.convertItem(item, sourceName)
    }
  }

  // 从页面中提取图片
  private async extractImages(url: string, title: string): Promise<ImageInfo[]> {
    try {
      logger.info(`🖼️ 提取图片: ${title.substring(0, 30)}...`)
      
      const html = await myFetch(url, { timeout: 15000 })
      const $ = cheerio.load(html)
      
      // 移除不需要的元素
      $('script, style, nav, header, footer, .advertisement, .ads, .social-share, .comment, .sidebar, .related-article, .breadcrumb, .tags, .meta').remove()
      
      // 尝试多种常见的内容选择器来定位正文区域
      const contentSelectors = [
        'article .content',  // 36氪等网站
        '.article-content',
        '.post-content', 
        '.entry-content',
        '.content',
        'article',
        'main',
        '.story-body',
        '.article-body',
        '.post-body',
        '.rich_media_content',  // 微信公众号
        '#article-content',     // 通用ID选择器
        '.post-content .text',  // 一些博客平台
        '.article-main',        // 一些新闻网站
        '.news-content',        // 新闻内容类
        '.content-main',        // 主内容区域
        '.g-content',           // 一些网站的内容类
        '.detail-content',      // 详情页内容
        '.article-detail',      // 文章详情
        '.post_article',        // 另一种文章容器
        '.post-body-content'    // 另一种内容容器
      ]
      
      let contentElement = null
      for (const selector of contentSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          // 检查元素是否包含足够的文本内容
          const textContent = element.text().trim()
          if (textContent.length > 100) {
            contentElement = element
            break
          }
        }
      }
      
      const images: ImageInfo[] = []
      
      // 如果找到了正文区域，只提取正文中的图片
      if (contentElement) {
        logger.info('🔍 在正文区域中查找图片...')
        // 查找正文中的图片
        contentElement.find('img').each((index, element) => {
          const $img = $(element)
          let imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original')
          const alt = $img.attr('alt') || ''
          
          if (imgSrc) {
            // 处理相对路径
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc
            } else if (imgSrc.startsWith('/')) {
              const baseUrl = new URL(url)
              imgSrc = baseUrl.origin + imgSrc
            } else if (!imgSrc.startsWith('http')) {
              imgSrc = new URL(imgSrc, url).href
            }
            
            // 过滤掉明显不是内容图片的图片
            if (!imgSrc.includes('ad') && !imgSrc.includes('banner') && !imgSrc.includes('tracking') && 
                !imgSrc.includes('/t.png') && // IT之家的追踪像素
                !alt.includes('广告') && !alt.includes('ad') &&
                !imgSrc.includes('pixel') && !imgSrc.includes('blank')) {
              logger.info(`🖼️ 找到正文图片: ${imgSrc.substring(0, 100)}...`)
              images.push({
                id: `img-${Date.now()}-${index}`,
                originalUrl: imgSrc,
                localPath: '',
                format: this.getImageFormat(imgSrc),
                size: 0,
                width: undefined,
                height: undefined
              })
            } else {
              logger.info(`🗑️ 过滤非正文图片: ${imgSrc.substring(0, 100)}...`)
            }
          }
        })
      } else {
        logger.info('⚠️ 未找到正文区域，使用通用图片提取方法...')
        // 如果没找到正文区域，使用原来的通用方法
        const imgSelectors = [
          'article img',
          '.article-content img',
          '.post-content img',
          '.content img',
          'main img',
          '.story-body img'
        ]
        
        const foundImages = new Set<string>() // 去重
        
        for (const selector of imgSelectors) {
          $(selector).each((index, element) => {
            const $img = $(element)
            let imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original')
            
            if (imgSrc && !foundImages.has(imgSrc)) {
              // 处理相对路径
              if (imgSrc.startsWith('//')) {
                imgSrc = 'https:' + imgSrc
              } else if (imgSrc.startsWith('/')) {
                const baseUrl = new URL(url)
                imgSrc = baseUrl.origin + imgSrc
              } else if (!imgSrc.startsWith('http')) {
                imgSrc = new URL(imgSrc, url).href
              }
              
              // 过滤掉太小的图片和广告图片
              const width = parseInt($img.attr('width') || '0')
              const height = parseInt($img.attr('height') || '0')
              const alt = $img.attr('alt') || ''
              
              // 跳过明显的广告或装饰图片
              if (alt.includes('广告') || alt.includes('ad') || 
                  imgSrc.includes('ad') || imgSrc.includes('banner') ||
                  imgSrc.includes('/t.png') || // IT之家的追踪像素
                  imgSrc.includes('tracking') || imgSrc.includes('pixel') ||
                  (width > 0 && height > 0 && (width < 100 || height < 100)) ||
                  (width === 1 && height === 1)) { // 1x1 追踪像素
                logger.info(`🗑️ 过滤广告或追踪图片: ${imgSrc.substring(0, 100)}...`)
                return
              }
              
              foundImages.add(imgSrc)
              images.push({
                id: `img-${Date.now()}-${index}`,
                originalUrl: imgSrc,
                localPath: '',
                format: this.getImageFormat(imgSrc),
                size: 0,
                width: width > 0 ? width : undefined,
                height: height > 0 ? height : undefined
              })
            }
          })
          
          if (images.length >= 5) break // 限制图片数量
        }
      }
      
      // 下载图片
      if (images.length > 0) {
        const articleId = this.generateArticleId(title)
        const processedImages = await this.imageHandler.processImages(images, articleId)
        
        // 过滤掉太小的图片（可能是追踪像素）
        const validImages = processedImages.filter(img => {
          if (img.size && img.size < 1000) { // 小于 1KB 的图片可能是追踪像素
            logger.warn(`⚠️ 过滤小图片: ${img.originalUrl} (${img.size} bytes)`)
            return false
          }
          return true
        })
        
        logger.success(`🖼️ 图片处理完成: ${validImages.length}/${images.length} 张有效图片`)
        return validImages
      }
      
      return []
      
    } catch (error) {
      logger.warn(`⚠️ 图片提取失败: ${title}`, error.message)
      return []
    }
  }

  private generateArticleId(title: string): string {
    return `ai-${Date.now()}-${title.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`
  }

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0]
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    if (extension && supportedFormats.includes(extension)) {
      return extension === 'jpeg' ? 'jpg' : extension
    }
    return 'jpg'
  }

  private convertItem(item: any, sourceName: string): any {
    const title = item.title || '无标题'
    const url = item.url || ''
    const content = item.content || `${title} - 来自${sourceName}的最新AI技术资讯。`
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
      tags: ['AI', '科技', '技术']
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
let crawlerInstance: AITechNewsCrawler | null = null

export function getAITechNewsCrawler(): AITechNewsCrawler {
  if (!crawlerInstance) {
    crawlerInstance = new AITechNewsCrawler()
  }
  return crawlerInstance
}

// 添加sleep函数定义
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
