#!/usr/bin/env node
// CLI 工具
import { consola } from 'consola'
import { NewsClipperSystem } from '../src/index.js'

const logger = consola.withTag('CLI')

interface CliOptions {
  command: string
  args: string[]
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  const restArgs = args.slice(1)
  
  return { command, args: restArgs }
}

function showHelp() {
  console.log(`
📰 News Catch - 基于 Obsidian Web Clipper 的新闻抓取系统

用法:
  npx tsx cli/cli.ts <command> [options]

命令:
  start           启动新闻抓取系统
  stop            停止新闻抓取系统  
  run-once        手动执行一次抓取
  status          查看系统状态
  stats           查看统计信息
  search <query>  搜索文章
  sources         管理新闻源
  demo            运行演示
  test            运行测试
  help            显示帮助信息

示例:
  npx tsx cli/cli.ts start
  npx tsx cli/cli.ts run-once
  npx tsx cli/cli.ts search "AI"
  npx tsx cli/cli.ts stats
`)
}

async function handleCommand(options: CliOptions) {
  const { command, args } = options
  
  switch (command) {
    case 'start':
      await startSystem()
      break
      
    case 'run-once':
      await runOnce()
      break
      
    case 'status':
      await showStatus()
      break
      
    case 'stats':
      await showStats()
      break
      
    case 'search':
      await searchArticles(args[0] || '')
      break
      
    case 'sources':
      await manageSources()
      break
      
    case 'demo':
      await runDemo()
      break
      
    case 'test':
      await runTest()
      break
      
    case 'help':
    default:
      showHelp()
      break
  }
}

async function startSystem() {
  logger.info('🚀 启动新闻抓取系统...')
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    system.start()
    
    logger.success('✅ 系统已启动，按 Ctrl+C 停止')
    
    // 处理优雅关闭
    process.on('SIGINT', async () => {
      logger.info('📡 接收到关闭信号...')
      await system.shutdown()
      process.exit(0)
    })
    
    // 保持进程运行
    await new Promise(() => {})
    
  } catch (error) {
    logger.error('❌ 系统启动失败:', error)
    process.exit(1)
  }
}

async function runOnce() {
  logger.info('🔄 执行手动抓取...')
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    
    const result = await system.runOnce()
    
    logger.success(`✅ 抓取完成: ${result.articles.length} 篇文章`)
    
    if (result.articles.length > 0) {
      logger.info('📰 最新文章:')
      result.articles.slice(0, 3).forEach((article: any, index: number) => {
        logger.info(`${index + 1}. ${article.title} (${article.source})`)
      })
    }
    
    await system.shutdown()
    
  } catch (error) {
    logger.error('❌ 手动抓取失败:', error)
    process.exit(1)
  }
}

async function showStatus() {
  logger.info('📊 获取系统状态...')
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    
    const status = system.getStatus()
    
    console.log('\\n📈 系统状态:')
    console.log(`运行状态: ${status.isRunning ? '✅ 运行中' : '❌ 已停止'}`)
    console.log(`总运行次数: ${status.stats.totalRuns}`)
    console.log(`成功次数: ${status.stats.successfulRuns}`)
    console.log(`失败次数: ${status.stats.failedRuns}`)
    console.log(`总文章数: ${status.stats.totalArticles}`)
    console.log(`上次运行: ${status.stats.lastRun || '未运行'}`)
    console.log(`下次运行: ${status.stats.nextRun || '未计划'}`)
    
    await system.shutdown()
    
  } catch (error) {
    logger.error('❌ 获取状态失败:', error)
    process.exit(1)
  }
}

async function showStats() {
  logger.info('📈 获取统计信息...')
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    
    const stats = system.getStats()
    
    console.log('\\n📊 存储统计:')
    console.log(`总文章数: ${stats.totalArticles}`)
    console.log(`总图片数: ${stats.totalImages}`)
    console.log(`最近24小时: ${stats.recentArticles} 篇`)
    
    console.log('\\n📰 新闻源统计:')
    stats.sourceStats.forEach((source: any) => {
      console.log(`${source.source}: ${source.count} 篇文章`)
    })
    
    await system.shutdown()
    
  } catch (error) {
    logger.error('❌ 获取统计失败:', error)
    process.exit(1)
  }
}

async function searchArticles(query: string) {
  if (!query) {
    logger.error('❌ 请提供搜索关键词')
    return
  }
  
  logger.info(`🔍 搜索文章: "${query}"`)
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    
    const result = system.searchArticles({
      keyword: query,
      limit: 10
    })
    
    console.log(`\\n🔍 搜索结果: 共找到 ${result.total} 篇文章`)
    
    if (result.items.length > 0) {
      result.items.forEach((article: any, index: number) => {
        console.log(`\\n${index + 1}. ${article.title}`)
        console.log(`   来源: ${article.source}`)
        console.log(`   时间: ${article.publishTime}`)
        console.log(`   URL: ${article.url}`)
      })
    } else {
      console.log('未找到相关文章')
    }
    
    await system.shutdown()
    
  } catch (error) {
    logger.error('❌ 搜索失败:', error)
    process.exit(1)
  }
}

async function manageSources() {
  logger.info('📡 新闻源管理...')
  
  const system = new NewsClipperSystem()
  
  try {
    await system.init()
    
    // 这里可以添加更多新闻源管理功能
    logger.info('新闻源管理功能开发中...')
    
    await system.shutdown()
    
  } catch (error) {
    logger.error('❌ 新闻源管理失败:', error)
    process.exit(1)
  }
}

async function runDemo() {
  logger.info('🎬 运行演示...')
  
  try {
    const { spawn } = await import('child_process')
    
    const child = spawn('npx', ['tsx', 'demo/demo.ts'], {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.success('✅ 演示完成')
      } else {
        logger.error('❌ 演示失败')
        process.exit(1)
      }
    })
    
  } catch (error) {
    logger.error('❌ 运行演示失败:', error)
    process.exit(1)
  }
}

async function runTest() {
  logger.info('🧪 运行测试...')
  
  try {
    const { spawn } = await import('child_process')
    
    const child = spawn('npx', ['tsx', 'test/test.ts'], {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        logger.success('✅ 测试完成')
      } else {
        logger.error('❌ 测试失败')
        process.exit(1)
      }
    })
    
  } catch (error) {
    logger.error('❌ 运行测试失败:', error)
    process.exit(1)
  }
}

// 主函数
async function main() {
  const options = parseArgs()
  await handleCommand(options)
}

// 运行 CLI
main().catch((error) => {
  logger.error('❌ CLI 执行失败:', error)
  process.exit(1)
})