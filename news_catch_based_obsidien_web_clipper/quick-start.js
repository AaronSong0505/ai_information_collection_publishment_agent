#!/usr/bin/env node

// 快速启动脚本
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 News Catch - 基于 Obsidian Web Clipper 的新闻抓取系统')
console.log('=' .repeat(60))

// 检查 Node.js 版本
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])

if (majorVersion < 18) {
  console.error('❌ Node.js 版本过低，需要 18+，当前版本:', nodeVersion)
  process.exit(1)
}

console.log('✅ Node.js 版本检查通过:', nodeVersion)

// 检查依赖
if (!fs.existsSync('node_modules')) {
  console.log('📦 正在安装依赖...')
  
  const install = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true
  })
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 依赖安装完成')
      startSystem()
    } else {
      console.error('❌ 依赖安装失败')
      process.exit(1)
    }
  })
} else {
  console.log('✅ 依赖已安装')
  startSystem()
}

function startSystem() {
  // 创建必要目录
  const dirs = ['data', 'data/images', 'config', 'logs', 'backup']
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
  
  console.log('✅ 目录创建完成')
  
  // 构建项目
  console.log('🔨 正在构建项目...')
  
  const build = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true
  })
  
  build.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 项目构建完成')
      
      // 显示使用说明
      console.log('\n🎯 系统已准备就绪！')
      console.log('\n📋 可用命令:')
      console.log('  npm run dev     - 开发模式启动')
      console.log('  npm start       - 生产模式启动')
      console.log('  npm run demo    - 运行演示')
      console.log('  npm run test    - 运行测试')
      console.log('\n🛠️  CLI 工具:')
      console.log('  npx tsx cli/cli.ts start     - 启动系统')
      console.log('  npx tsx cli/cli.ts run-once  - 手动抓取')
      console.log('  npx tsx cli/cli.ts status    - 查看状态')
      console.log('  npx tsx cli/cli.ts help      - 查看帮助')
      
      console.log('\n🚀 现在可以运行以下命令开始使用:')
      console.log('  npm run demo    # 运行演示')
      console.log('  npm run dev     # 启动开发模式')
      
    } else {
      console.error('❌ 项目构建失败')
      process.exit(1)
    }
  })
}