// 配置管理 CLI 工具
import { consola } from 'consola'
import { promises as fs } from 'fs'

const logger = consola.withTag('ConfigCLI')

interface ConfigCommand {
  action: string
  sourceId?: string
  enabled?: boolean
}

class ConfigCLI {
  private configPath: string = './config/ai-news-sources.json'

  /**
   * 解析命令行参数
   */
  parseArgs(): ConfigCommand {
    const args = process.argv.slice(2)
    
    if (args.length === 0) {
      return { action: 'list' }
    }

    const action = args[0]
    
    switch (action) {
      case 'enable':
        return { action: 'enable', sourceId: args[1] }
      case 'disable':
        return { action: 'disable', sourceId: args[1] }
      case 'toggle':
        return { action: 'toggle', sourceId: args[1] }
      case 'list':
        return { action: 'list' }
      case 'status':
        return { action: 'status' }
      default:
        return { action: 'help' }
    }
  }

  /**
   * 执行命令
   */
  async execute(): Promise<void> {
    const command = this.parseArgs()

    switch (command.action) {
      case 'list':
        await this.listSources()
        break
      case 'status':
        await this.showStatus()
        break
      case 'enable':
        await this.toggleSource(command.sourceId!, true)
        break
      case 'disable':
        await this.toggleSource(command.sourceId!, false)
        break
      case 'toggle':
        await this.toggleSourceAuto(command.sourceId!)
        break
      case 'help':
      default:
        this.showHelp()
        break
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log(`
🤖 AI 新闻源配置管理工具

用法:
  npm run config <command> [options]

命令:
  list                    显示所有新闻源
  status                  显示启用状态统计
  enable <source-id>      启用指定新闻源
  disable <source-id>     禁用指定新闻源
  toggle <source-id>      切换新闻源状态
  help                    显示帮助信息

示例:
  npm run config list
  npm run config enable 36kr-ai
  npm run config disable ithome-ai
  npm run config toggle juejin-ai

新闻源 ID:
  36kr-ai        - 36氪 AI 频道
  ithome-ai      - IT之家 AI 新闻
  juejin-ai      - 掘金 AI 技术
  solidot-ai     - Solidot AI 科技
  sspai-ai       - 少数派 AI 效率
  techcrunch-ai  - TechCrunch AI (默认禁用)
  arxiv-ai       - arXiv AI 论文 (默认禁用)
  aibase-news    - AIBase 资讯 (默认禁用)
`)
  }

  /**
   * 列出所有新闻源
   */
  async listSources(): Promise<void> {
    try {
      const config = await this.loadConfig()
      
      logger.info('📋 所有 AI 新闻源:')
      console.log('')
      
      config.sources.forEach((source: any, index: number) => {
        const status = source.enabled ? '✅ 启用' : '❌ 禁用'
        const interval = `${source.interval}分钟`
        const keywords = source.keywords.slice(0, 3).join(', ')
        
        console.log(`${index + 1}. ${source.name} (${source.id})`)
        console.log(`   状态: ${status}`)
        console.log(`   间隔: ${interval}`)
        console.log(`   关键词: ${keywords}...`)
        console.log(`   搜索URL: ${source.searchUrls.length} 个`)
        console.log('')
      })
      
    } catch (error) {
      logger.error('❌ 列出新闻源失败:', error.message)
    }
  }

  /**
   * 显示状态统计
   */
  async showStatus(): Promise<void> {
    try {
      const config = await this.loadConfig()
      
      const totalSources = config.sources.length
      const enabledSources = config.sources.filter((s: any) => s.enabled)
      const disabledSources = config.sources.filter((s: any) => !s.enabled)
      
      logger.info('📊 新闻源状态统计:')
      console.log('')
      console.log(`总数: ${totalSources}`)
      console.log(`启用: ${enabledSources.length}`)
      console.log(`禁用: ${disabledSources.length}`)
      console.log('')
      
      if (enabledSources.length > 0) {
        console.log('✅ 启用的新闻源:')
        enabledSources.forEach((source: any) => {
          console.log(`   - ${source.name} (${source.id})`)
        })
        console.log('')
      }
      
      if (disabledSources.length > 0) {
        console.log('❌ 禁用的新闻源:')
        disabledSources.forEach((source: any) => {
          console.log(`   - ${source.name} (${source.id})`)
        })
      }
      
    } catch (error) {
      logger.error('❌ 显示状态失败:', error.message)
    }
  }

  /**
   * 切换新闻源状态
   */
  async toggleSource(sourceId: string, enabled: boolean): Promise<void> {
    try {
      const config = await this.loadConfig()
      
      const source = config.sources.find((s: any) => s.id === sourceId)
      if (!source) {
        logger.error(`❌ 未找到新闻源: ${sourceId}`)
        logger.info('💡 使用 "npm run config list" 查看所有可用的新闻源 ID')
        return
      }
      
      if (source.enabled === enabled) {
        const status = enabled ? '启用' : '禁用'
        logger.warn(`⚠️ 新闻源 ${source.name} 已经是${status}状态`)
        return
      }
      
      source.enabled = enabled
      await this.saveConfig(config)
      
      const status = enabled ? '✅ 启用' : '❌ 禁用'
      logger.success(`${status} 新闻源: ${source.name}`)
      
    } catch (error) {
      logger.error('❌ 切换新闻源状态失败:', error.message)
    }
  }

  /**
   * 自动切换新闻源状态
   */
  async toggleSourceAuto(sourceId: string): Promise<void> {
    try {
      const config = await this.loadConfig()
      
      const source = config.sources.find((s: any) => s.id === sourceId)
      if (!source) {
        logger.error(`❌ 未找到新闻源: ${sourceId}`)
        return
      }
      
      const newStatus = !source.enabled
      await this.toggleSource(sourceId, newStatus)
      
    } catch (error) {
      logger.error('❌ 自动切换失败:', error.message)
    }
  }

  /**
   * 加载配置文件
   */
  private async loadConfig(): Promise<any> {
    const configData = await fs.readFile(this.configPath, 'utf-8')
    return JSON.parse(configData)
  }

  /**
   * 保存配置文件
   */
  private async saveConfig(config: any): Promise<void> {
    const configData = JSON.stringify(config, null, 2)
    await fs.writeFile(this.configPath, configData, 'utf-8')
  }
}

// 运行 CLI
const cli = new ConfigCLI()
cli.execute().catch(error => {
  logger.error('❌ CLI 执行失败:', error)
  process.exit(1)
})