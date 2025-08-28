// 社交媒体配置管理CLI
import { consola } from 'consola'
import { promises as fs } from 'fs'

const logger = consola.withTag('SocialMediaConfig')

interface SocialMediaConfigManager {
  listSources(): Promise<void>
  enableSource(sourceId: string): Promise<void>
  disableSource(sourceId: string): Promise<void>
  setEngagementThreshold(platform: string, threshold: number): Promise<void>
  addInfluencer(platform: string, username: string): Promise<void>
  showPlatformStats(): Promise<void>
}

class SocialMediaConfigCLI implements SocialMediaConfigManager {
  private configPath = './config/social-media-ai-sources.json'
  private config: any

  async init(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(configData)
    } catch (error) {
      logger.error('❌ 配置文件加载失败:', error)
      throw error
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
      logger.success('✅ 配置已保存')
    } catch (error) {
      logger.error('❌ 配置保存失败:', error)
    }
  }

  async listSources(): Promise<void> {
    logger.info('📱 社交媒体 AI 新闻源列表:')
    logger.info('=' .repeat(60))
    
    this.config.sources.forEach((source: any, index: number) => {
      const status = source.enabled ? '🟢 启用' : '🔴 禁用'
      const platform = source.socialMediaConfig.platform.toUpperCase()
      const engagement = source.socialMediaConfig.engagementWeight
      
      logger.info(`${index + 1}. ${source.name}`)
      logger.info(`   ID: ${source.id}`)
      logger.info(`   平台: ${platform}`)
      logger.info(`   状态: ${status}`)
      logger.info(`   互动权重: ${engagement}`)
      logger.info(`   抓取间隔: ${source.interval}分钟`)
      
      // 显示平台特定配置
      const config = source.socialMediaConfig
      const filters = []
      if (config.minUpvotes) filters.push(`赞数≥${config.minUpvotes}`)
      if (config.minViews) filters.push(`观看≥${config.minViews}`)
      if (config.minStars) filters.push(`星标≥${config.minStars}`)
      if (config.minClaps) filters.push(`拍手≥${config.minClaps}`)
      if (config.minLikes) filters.push(`点赞≥${config.minLikes}`)
      
      if (filters.length > 0) {
        logger.info(`   筛选条件: ${filters.join(', ')}`)
      }
      
      if (config.preferredChannels && config.preferredChannels.length > 0) {
        logger.info(`   优选频道: ${config.preferredChannels.slice(0, 2).join(', ')}${config.preferredChannels.length > 2 ? '...' : ''}`)
      }
      
      logger.info('')
    })
  }

  async enableSource(sourceId: string): Promise<void> {
    const source = this.config.sources.find((s: any) => s.id === sourceId)
    if (!source) {
      logger.error(`❌ 未找到源: ${sourceId}`)
      return
    }
    
    source.enabled = true
    await this.saveConfig()
    logger.success(`✅ 已启用: ${source.name} [${source.socialMediaConfig.platform.toUpperCase()}]`)
  }

  async disableSource(sourceId: string): Promise<void> {
    const source = this.config.sources.find((s: any) => s.id === sourceId)
    if (!source) {
      logger.error(`❌ 未找到源: ${sourceId}`)
      return
    }
    
    source.enabled = false
    await this.saveConfig()
    logger.success(`✅ 已禁用: ${source.name} [${source.socialMediaConfig.platform.toUpperCase()}]`)
  }

  async setEngagementThreshold(platform: string, threshold: number): Promise<void> {
    const sources = this.config.sources.filter((s: any) => s.socialMediaConfig.platform === platform.toLowerCase())
    
    if (sources.length === 0) {
      logger.error(`❌ 未找到平台: ${platform}`)
      return
    }

    sources.forEach((source: any) => {
      source.socialMediaConfig.engagementWeight = threshold
    })

    await this.saveConfig()
    logger.success(`✅ 已设置 ${platform.toUpperCase()} 平台互动权重为: ${threshold}`)
  }

  async addInfluencer(platform: string, username: string): Promise<void> {
    const sources = this.config.sources.filter((s: any) => s.socialMediaConfig.platform === platform.toLowerCase())
    
    if (sources.length === 0) {
      logger.error(`❌ 未找到平台: ${platform}`)
      return
    }

    sources.forEach((source: any) => {
      if (!source.socialMediaConfig.preferredChannels) {
        source.socialMediaConfig.preferredChannels = []
      }
      if (!source.socialMediaConfig.preferredChannels.includes(username)) {
        source.socialMediaConfig.preferredChannels.push(username)
      }
    })

    await this.saveConfig()
    logger.success(`✅ 已添加 ${platform.toUpperCase()} 优选用户: ${username}`)
  }

  async showPlatformStats(): Promise<void> {
    logger.info('📊 平台统计信息:')
    logger.info('=' .repeat(50))
    
    const platformStats = this.config.sources.reduce((stats: any, source: any) => {
      const platform = source.socialMediaConfig.platform
      if (!stats[platform]) {
        stats[platform] = {
          total: 0,
          enabled: 0,
          avgInterval: 0,
          avgEngagement: 0
        }
      }
      
      stats[platform].total++
      if (source.enabled) stats[platform].enabled++
      stats[platform].avgInterval += source.interval
      stats[platform].avgEngagement += source.socialMediaConfig.engagementWeight
      
      return stats
    }, {})

    Object.entries(platformStats).forEach(([platform, stats]: [string, any]) => {
      const enabledRatio = `${stats.enabled}/${stats.total}`
      const avgInterval = Math.round(stats.avgInterval / stats.total)
      const avgEngagement = (stats.avgEngagement / stats.total).toFixed(2)
      
      logger.info(`${platform.toUpperCase()}:`)
      logger.info(`  启用源数: ${enabledRatio}`)
      logger.info(`  平均间隔: ${avgInterval}分钟`)
      logger.info(`  平均权重: ${avgEngagement}`)
      logger.info('')
    })

    // 显示全局设置
    logger.info('🌐 全局设置:')
    const globalSettings = this.config.globalSettings
    logger.info(`  每源最大文章数: ${globalSettings.maxArticlesPerSource}`)
    logger.info(`  启用互动筛选: ${globalSettings.socialMediaSettings.enableEngagementFiltering ? '是' : '否'}`)
    logger.info(`  互动阈值: ${globalSettings.socialMediaSettings.engagementThreshold}`)
    logger.info(`  每日最大帖子数: ${globalSettings.socialMediaSettings.maxDailyPosts}`)
    logger.info(`  请求延迟: ${globalSettings.requestDelay}ms`)
  }
}

// CLI 主函数
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  const cli = new SocialMediaConfigCLI()
  
  try {
    await cli.init()
    
    switch (command) {
      case 'list':
        await cli.listSources()
        break
        
      case 'enable':
        if (!args[1]) {
          logger.error('❌ 请提供源ID: npm run social-config enable <source-id>')
          return
        }
        await cli.enableSource(args[1])
        break
        
      case 'disable':
        if (!args[1]) {
          logger.error('❌ 请提供源ID: npm run social-config disable <source-id>')
          return
        }
        await cli.disableSource(args[1])
        break
        
      case 'engagement':
        if (!args[1] || !args[2]) {
          logger.error('❌ 请提供平台和阈值: npm run social-config engagement <platform> <threshold>')
          return
        }
        await cli.setEngagementThreshold(args[1], parseFloat(args[2]))
        break
        
      case 'add-influencer':
        if (!args[1] || !args[2]) {
          logger.error('❌ 请提供平台和用户名: npm run social-config add-influencer <platform> <username>')
          return
        }
        await cli.addInfluencer(args[1], args[2])
        break
        
      case 'stats':
        await cli.showPlatformStats()
        break
        
      case 'help':
      default:
        logger.info('📱 社交媒体配置管理 CLI')
        logger.info('=' .repeat(40))
        logger.info('可用命令:')
        logger.info('  list                        - 列出所有社交媒体源')
        logger.info('  enable <source-id>          - 启用指定源')
        logger.info('  disable <source-id>         - 禁用指定源')
        logger.info('  engagement <platform> <val> - 设置平台互动权重')
        logger.info('  add-influencer <platform> <user> - 添加优选用户')
        logger.info('  stats                       - 显示平台统计')
        logger.info('  help                        - 显示帮助')
        logger.info('')
        logger.info('示例:')
        logger.info('  npm run social-config list')
        logger.info('  npm run social-config enable reddit-ai')
        logger.info('  npm run social-config engagement reddit 0.5')
        logger.info('  npm run social-config add-influencer youtube "Two Minute Papers"')
        break
    }
    
  } catch (error) {
    logger.error('❌ 执行失败:', error)
    process.exit(1)
  }
}

// 运行CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { SocialMediaConfigCLI }