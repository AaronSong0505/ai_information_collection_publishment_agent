import { promises as fs } from 'fs'
import { join } from 'path'
import logger from '../server/utils/logger.js'

async function verifySetup() {
  logger.info('🔍 验证 News Catch 设置...')
  
  const projectRoot = process.cwd()
  const checks = []
  
  // 检查必要文件
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    '.env.example',
    'server/app.ts',
    'server/database/index.ts',
    'shared/types.ts'
  ]
  
  for (const file of requiredFiles) {
    const filePath = join(projectRoot, file)
    try {
      await fs.access(filePath)
      checks.push({ name: `文件: ${file}`, status: '✅' })
    } catch {
      checks.push({ name: `文件: ${file}`, status: '❌' })
    }
  }
  
  // 检查必要目录
  const requiredDirs = [
    'server',
    'shared',
    'scripts',
    'test'
  ]
  
  for (const dir of requiredDirs) {
    const dirPath = join(projectRoot, dir)
    try {
      const stat = await fs.stat(dirPath)
      if (stat.isDirectory()) {
        checks.push({ name: `目录: ${dir}`, status: '✅' })
      } else {
        checks.push({ name: `目录: ${dir}`, status: '❌' })
      }
    } catch {
      checks.push({ name: `目录: ${dir}`, status: '❌' })
    }
  }
  
  // 检查 node_modules
  try {
    await fs.access(join(projectRoot, 'node_modules'))
    checks.push({ name: '依赖安装', status: '✅' })
  } catch {
    checks.push({ name: '依赖安装', status: '❌ 请运行 pnpm install' })
  }
  
  // 检查环境文件
  try {
    await fs.access(join(projectRoot, '.env.server'))
    checks.push({ name: '环境配置', status: '✅' })
  } catch {
    checks.push({ name: '环境配置', status: '⚠️ 请复制 .env.example 到 .env.server' })
  }
  
  // 检查数据目录
  const dataDir = join(projectRoot, 'data')
  try {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.mkdir(join(dataDir, 'images'), { recursive: true })
    checks.push({ name: '数据目录', status: '✅' })
  } catch {
    checks.push({ name: '数据目录', status: '❌ 无法创建数据目录' })
  }
  
  // 检查日志目录
  const logsDir = join(projectRoot, 'logs')
  try {
    await fs.mkdir(logsDir, { recursive: true })
    checks.push({ name: '日志目录', status: '✅' })
  } catch {
    checks.push({ name: '日志目录', status: '❌ 无法创建日志目录' })
  }
  
  // 显示检查结果
  logger.info('\n📋 设置检查结果:')
  checks.forEach(check => {
    logger.info(`  ${check.status} ${check.name}`)
  })
  
  const failedChecks = checks.filter(check => check.status.includes('❌'))
  const warningChecks = checks.filter(check => check.status.includes('⚠️'))
  
  if (failedChecks.length === 0) {
    logger.success('\n🎉 所有检查通过！系统已准备就绪。')
    logger.info('\n📝 下一步:')
    logger.info('  1. 运行 pnpm run init-sources 初始化数据库')
    logger.info('  2. 运行 pnpm run demo 测试功能')
    logger.info('  3. 运行 pnpm run dev 启动开发服务器')
    logger.info('  或者使用启动脚本:')
    logger.info('  - Windows: news-catch.bat init && news-catch.bat start')
    logger.info('  - PowerShell: .\\news-catch.ps1 init; .\\news-catch.ps1 start')
  } else {
    logger.error(`\n❌ 发现 ${failedChecks.length} 个问题需要解决`)
    if (warningChecks.length > 0) {
      logger.warn(`⚠️ 发现 ${warningChecks.length} 个警告`)
    }
  }
  
  return failedChecks.length === 0
}

// 运行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySetup().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    logger.error('验证过程出错:', error)
    process.exit(1)
  })
}

export { verifySetup }