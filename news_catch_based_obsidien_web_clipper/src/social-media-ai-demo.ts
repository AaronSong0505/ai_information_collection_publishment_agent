// 社交媒体 AI 新闻抓取演示
import { consola } from 'consola'
import { SocialMediaAICrawler } from './social-media-ai-crawler.js'

const logger = consola.withTag('SocialMediaDemo')

async function runSocialMediaDemo() {
  logger.info('📱 开始社交媒体 AI 新闻抓取演示...')
  
  try {
    // 1. 初始化社交媒体 AI 新闻爬虫
    const crawler = new SocialMediaAICrawler()
    await crawler.init()
    
    // 2. 显示启用的社交媒体新闻源
    const enabledSources = crawler.getEnabledSources()
    logger.info('📋 启用的社交媒体 AI 新闻源:')
    enabledSources.forEach((source, index) => {
      const platform = source.socialMediaConfig.platform.toUpperCase()
      const engagement = source.socialMediaConfig.engagementWeight
      logger.info(`   ${index + 1}. ${source.name} [${platform}] (互动权重: ${engagement})`)
      
      // 显示平台特定的筛选条件
      const config = source.socialMediaConfig
      const conditions = []
      if (config.minUpvotes) conditions.push(`赞数≥${config.minUpvotes}`)
      if (config.minViews) conditions.push(`观看≥${config.minViews}`)
      if (config.minStars) conditions.push(`星标≥${config.minStars}`)
      if (config.minClaps) conditions.push(`拍手≥${config.minClaps}`)
      if (config.minLikes) conditions.push(`点赞≥${config.minLikes}`)
      
      if (conditions.length > 0) {
        logger.info(`      筛选条件: ${conditions.join(', ')}`)
      }
    })
    
    // 3. 开始抓取
    logger.info('\\n🚀 开始抓取社交媒体 AI 相关内容...')
    logger.info('💡 注意: 社交媒体平台有反爬机制，抓取速度会较慢')
    
    const result = await crawler.crawlAllSources()
    
    // 4. 显示结果
    logger.success('\\n📊 抓取结果:')
    logger.info(`   总发现帖子: ${result.totalPosts} 条`)
    logger.info(`   成功保存: ${result.savedPosts} 条`)
    
    logger.info('\\n📱 各平台统计:')
    Object.entries(result.sources).forEach(([sourceName, count]) => {
      const source = enabledSources.find(s => s.name === sourceName)
      const platform = source ? `[${source.socialMediaConfig.platform.toUpperCase()}]` : ''
      logger.info(`   ${sourceName} ${platform}: ${count} 条`)
    })
    
    // 5. 显示存储统计
    const stats = await crawler.getStats()
    logger.info('\\n💾 存储统计:')
    logger.info(`   数据库总文章: ${stats.totalArticles} 篇`)
    logger.info(`   最近24小时: ${stats.recentArticles} 篇`)
    
    // 6. 显示社交媒体特色功能
    logger.info('\\n🌟 社交媒体特色功能:')
    logger.info('   ✅ 基于互动数据的智能筛选')
    logger.info('   ✅ 平台特定的内容解析')
    logger.info('   ✅ 影响力用户优先级')
    logger.info('   ✅ 实时热度评分机制')
    logger.info('   ✅ 反爬虫策略优化')
    
    // 7. 显示最新社交媒体内容示例
    logger.info('\\n📖 最新社交媒体 AI 内容:')
    const socialMediaStats = stats.sourceStats
      .filter((source: any) => source.source.includes('reddit') || 
                             source.source.includes('youtube') || 
                             source.source.includes('github'))
      .slice(0, 3)
    
    if (socialMediaStats.length > 0) {
      socialMediaStats.forEach((source: any, index: number) => {
        logger.info(`   ${index + 1}. ${source.source}: ${source.count} 条内容`)
      })
    }
    
    logger.success('\\n🎉 社交媒体 AI 新闻抓取演示完成!')
    logger.info('\\n💡 扩展建议:')
    logger.info('   📱 Twitter/X: 需要API密钥，考虑官方API')
    logger.info('   📸 Instagram: 主要是图片内容，适合AI图像相关')
    logger.info('   🎵 TikTok: 短视频平台，反爬机制严格')
    logger.info('   💼 LinkedIn: 商业AI内容丰富，需要登录')
    logger.info('   🎮 Discord: 需要Bot权限，社区讨论丰富')
    
    logger.info('\\n⚙️ 配置优化:')
    logger.info('   - 调整 social-media-ai-sources.json 中的筛选条件')
    logger.info('   - 设置平台特定的延迟和限制')
    logger.info('   - 配置代理以提高成功率')
    
  } catch (error) {
    logger.error('❌ 社交媒体 AI 新闻演示失败:', error)
    
    // 提供故障排除建议
    logger.info('\\n🔧 故障排除建议:')
    logger.info('   1. 检查网络连接')
    logger.info('   2. 确认配置文件格式正确') 
    logger.info('   3. 某些平台可能需要代理访问')
    logger.info('   4. 部分平台有地区限制')
    logger.info('   5. 考虑使用官方API替代爬取')
  }
}

// 运行演示
runSocialMediaDemo().catch(console.error)