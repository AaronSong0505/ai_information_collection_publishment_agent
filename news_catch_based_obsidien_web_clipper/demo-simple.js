#!/usr/bin/env node

// 简化的演示脚本 - 不依赖 tsx
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🎬 News Catch 演示')
console.log('==================')

// 检查是否已构建
if (!fs.existsSync('dist')) {
  console.log('❌ 项目未构建，请先运行: npm run build')
  process.exit(1)
}

// 检查 obsidian-clipper 是否存在
if (!fs.existsSync('obsidian-clipper')) {
  console.log('❌ Obsidian Web Clipper 未设置，请先运行: npm run setup')
  process.exit(1)
}

console.log('✅ 环境检查通过')
console.log('🚀 启动演示...')

// 运行构建后的演示
const demo = spawn('node', ['dist/demo/demo.js'], {
  stdio: 'inherit'
})

demo.on('close', (code) => {
  if (code === 0) {
    console.log('🎉 演示完成！')
  } else {
    console.log('❌ 演示失败')
    console.log('')
    console.log('💡 故障排除：')
    console.log('1. 确保已安装依赖: npm install')
    console.log('2. 确保已设置集成: npm run setup')
    console.log('3. 确保已构建项目: npm run build')
  }
})